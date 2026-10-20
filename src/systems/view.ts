import { simpleTerm, canExpand } from './expression';
import { rat, neg, one, zero, str, div, readRational } from '../math/rational';
import { escape } from '../math/format';
import { systemLevels, type SystemLevel } from './levels';
import { actionLabel, canSubstitute, copyRows, displayParts, factorAction, factorValue, writtenTerm, mergeableTerms, rowHasVariable, scaleByInteger, reduceSystem, systemHint, transformSystem, variables, verifySystem, type FactorPart, type Row, type Side, type SystemAction, type Reduction } from './engine';
import { newSystemGame, readSystemSnapshot, systemSnapshot, systemUnlocked, type SystemGame, type SystemsData } from './save';
import { equationHTML, carriedTerm, carriedWrittenTerm, qMath, rowSides, rowText, solutionHTML, solutionText } from './render';
import type { Cue } from '../ui/sound';
interface Options { data:SystemsData; render:(html:string)=>void; save:()=>void; sound:(cue:Cue)=>void; explain:()=>boolean }
const check='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
const brace='<svg class="sys-brace" viewBox="0 0 12 100" preserveAspectRatio="none" aria-hidden="true"><path d="M11 1 C4 1 4 8 4 23 L4 41 Q4 50 1 50 Q4 50 4 59 L4 77 C4 92 4 99 11 99"/></svg>';
const btn=(id:string,label:string,cls='secondary',extra='')=>`<button type="button" id="${id}" class="${cls}" ${extra}>${label}</button>`;
const factorValueSafe=(r:Row,side:Side,j:number|null,part:FactorPart,term?:number)=>{try{return factorValue(r,side,j,part,term);}catch{return null;}};
const stars=(n:number)=>`<span class="sys-stars" aria-label="${n} étoiles sur 3">${'★'.repeat(n)}<span>${'☆'.repeat(3-n)}</span></span>`;
export class SystemsController {
    private game:SystemGame|null;
    private result:Reduction|null=null;
    private resultStars=0;
    private selection:{row:number;variable?:number;side?:Side;constant?:boolean;part?:FactorPart;term?:number;terms?:number[]}|null=null;
    private wheelRow:number|null=null;
    private fitBoard:(()=>void)|null=null;
    private feedback='';
    private abort:AbortController|null=null;
    private stopGesture:(()=>void)|null=null;
    private sizeObserver:ResizeObserver|null=null;
    private frame=0;
    private showingGame=false;
    constructor(private options:Options){this.game=readSystemSnapshot(options.data.active);}
    detach(){this.stopGesture?.();this.stopGesture=null;this.abort?.abort();this.abort=null;this.sizeObserver?.disconnect();this.sizeObserver=null;cancelAnimationFrame(this.frame);this.frame=0;document.querySelector('.sys-modal')?.remove();}
    show(){this.map();}
    private persist(){this.options.data.active=this.game&&!this.result?systemSnapshot(this.game):null;this.options.save();}
    private on(selector:string,fn:(event:Event)=>void,type='click'){document.querySelectorAll<HTMLElement>(selector).forEach(el=>el.addEventListener(type,fn,{signal:this.abort!.signal}));}
    private paint(html:string){this.detach();this.options.render(html);this.abort=new AbortController();}
    private modeHTML(){return `<span class="sys-wheel-mode" role="group" aria-label="Action de la molette"><button type="button" data-wheel-mode="multiply" aria-pressed="${this.options.data.wheelMode==='multiply'}" aria-label="Molette : multiplier">×</button><button type="button" data-wheel-mode="divide" aria-pressed="${this.options.data.wheelMode==='divide'}" aria-label="Molette : diviser">÷</button></span>`;}
    private bindMode(){this.on('[data-wheel-mode]',e=>{this.options.data.wheelMode=(e.currentTarget as HTMLElement).dataset.wheelMode as 'multiply'|'divide';this.persist();this.renderGame();});}
    private map(){
        this.showingGame=false;const data=this.options.data,total=systemLevels.reduce((n,l)=>n+(data.results[l.id]?.stars??0),0);
        this.paint(`<section class="sys-map"><header class="page-head compact"><p class="eyebrow">NOUVEAU LABORATOIRE · SYSTÈMES</p><h1>Plusieurs inconnues.<br><em>Un même équilibre.</em></h1><p>Substitue une expression. Combine les lignes. Libère toutes les inconnues.</p><div class="sys-progress"><strong>${Object.keys(data.results).length} / ${systemLevels.length}</strong> expériences réussies <span>✦ ${total} / ${systemLevels.length*3}</span></div>${this.game?btn('sys-resume','Reprendre mon système →','primary'):''}</header>${['Substitution','Combinaison','Choix de méthode','Bonus · 3 inconnues'].map((chapter,group)=>`<section class="sys-chapter"><div class="section-heading"><h2><span>${String(group+1).padStart(2,'0')}</span> ${chapter}</h2><p>${group===0?'Une expression prend le relais.':group===1?'Les opposés s’effacent ensemble.':group===2?'Ta méthode, tes solutions.':'Une substitution agit sur plusieurs lignes.'}</p></div><div class="sys-level-grid">${systemLevels.map((l,i)=>({l,i})).filter(({l})=>l.chapter===chapter).map(({l,i})=>`<button type="button" class="sys-level" data-system-level="${l.id}" ${systemUnlocked(data,i)?'':'disabled'}><span class="sys-level-number">${String(i+1).padStart(2,'0')}</span><span><small>${l.rows[0].coefficients.length} INCONNUES</small><strong>${escape(l.title)}</strong>${stars(data.results[l.id]?.stars??0)}</span><span class="sys-level-arrow">${systemUnlocked(data,i)?'↗':'⌑'}</span></button>`).join('')}</div></section>`).join('')}</section>`);
        this.on('[data-system-level]',e=>this.open((e.currentTarget as HTMLElement).dataset.systemLevel!));this.on('#sys-resume',()=>this.renderGame());
    }
    private open(id:string){this.wheelRow=null;this.game=newSystemGame(id);this.result=null;this.selection=null;this.feedback=this.level.tip;this.persist();this.renderGame();window.scrollTo(0,0);}
    private get level():SystemLevel{return systemLevels.find(l=>l.id===this.game!.level)!;}
    private selectedActions(){
        if(!this.game||!this.selection)return '<p class="selection-help">Glisse un terme de l’autre côté du =. Appui long : saisir un facteur. Touche le point pour la molette ; glisse-le sur une autre ligne pour additionner.</p>';
        const s=this.selection,{row,variable,term}=s,r=this.game.rows[row],j=s.constant||variable===undefined?null:variable;
        if(s.side&&s.terms&&s.terms.length>1)return `${mergeableTerms(r,s.side,s.terms)?btn('sys-merge','Fusionner les termes','action special'):'<p class="selection-help">Choisis des termes semblables : nombres, x, y ou z.</p>'}${btn('sys-clear-selection','Effacer la sélection','text-button')}`;
        const moves=s.side?btn('sys-move-term',`Passer ${s.constant?'la constante':variable===undefined?'le terme':variables[variable]} à ${s.side==='left'?'droite':'gauche'}`,'action'):'';
        let factors='';
        if(s.side)for(const part of ['coefficient','numerator','denominator'] as const){
            if(part==='numerator'&&factorValueSafe(r,s.side,j,'denominator',term)===null)continue;
            try{const q=factorValue(r,s.side,j,part,term);factors+=`<button class="action grip-action" data-pick-system-factor="${part}">Saisir ${part==='denominator'?'le dénominateur':part==='numerator'?'le numérateur':'le coefficient'} ${qMath(q)}</button>`;}catch{ /* No non-unit factor here. */ }
        }
        const factor=s.part&&s.side?factorAction(row,r,s.side,j,s.part,term):null;
        const factorButton=factor?.kind==='factor'?btn('sys-apply-factor',`${factor.part==='denominator'?'×':'÷'} ${factor.value.startsWith('-')?'(':''}${qMath(readRational(factor.value))}${factor.value.startsWith('-')?')':''} aux deux membres`,'action special'):'';
        const selectedNode=term!==undefined&&s.side?writtenTerm(r,s.side,term):null;
        const expansion=selectedNode&&canExpand(selectedNode)?btn('sys-expand',selectedNode.kind==='sum'?'Retirer les parenthèses':selectedNode.kind==='scale'&&selectedNode.body.kind==='constant'?'Calculer le produit':'Développer','action special'):'';
        const substitution=variable!==undefined&&canSubstitute(r,variable)&&this.game.rows.some((r,i)=>i!==row&&rowHasVariable(r,variable))?`<button class="action special" data-substitute="${variable}">Substituer ${variables[variable]}</button>`:'';
        const offset=`<span class="sys-offset"><label>Aux deux membres de L${row+1}<input id="sys-offset-value" aria-label="Nombre à ajouter ou soustraire aux deux membres de L${row+1}" inputmode="text" placeholder="Nombre" maxlength="40"></label><button class="action" data-offset="add" aria-label="Ajouter aux deux membres">+</button><button class="action" data-offset="subtract" aria-label="Soustraire aux deux membres">−</button></span>`;
        return `${substitution}${expansion}${factorButton}${moves}${factors}${btn('sys-multiply','Ouvrir la molette','action')}${btn('sys-negate','× (−1)','action')}${this.game.rows.map((_,i)=>i!==row?`<button class="action" data-add="${i}" aria-label="Ajouter la ligne ${row+1} à la ligne ${i+1}">L${row+1} + L${i+1}</button>`:'').join('')}${offset}`;
    }
    private selectedMove():SystemAction{const s=this.selection!;return s.term!==undefined?{kind:'written-move',row:s.row,side:s.side!,term:s.term}:{kind:'move',row:s.row,side:s.side!,variable:s.constant?null:s.variable!};}
    private renderGame(){
        if(!this.game)return this.map();if(this.result)return this.renderResult();
        this.showingGame=true;const g=this.game,l=this.level,n=g.rows[0].coefficients.length;
        this.paint(`<section class="sys-game" style="--unknowns:${n}"><header class="sys-heading"><div>${btn('sys-back','← Niveaux','text-button')}<p class="eyebrow">SYSTÈMES · ${l.chapter.toLocaleUpperCase('fr')}</p><h1>${escape(l.title)}</h1></div>${btn('sys-rule','La règle ↗','text-button')}</header><div class="sys-meter"><span><b>${g.moves}</b> transformations</span><span>Objectif ★★★ : ≤ ${l.budget}</span><span class="sys-default-wheel">Molette ${this.modeHTML()}</span></div><div class="sys-board" id="sys-board" aria-label="Système de ${g.rows.length} équations à ${n} inconnues">${brace}${g.rows.map((r,i)=>`<div class="sys-line ${this.selection?.row===i?'selected':''}" data-system-row="${i}"><button type="button" class="sys-handle" data-handle="${i}" aria-label="Ligne ${i+1} : ouvrir la molette ; glisser sur une autre ligne" title="Toucher : molette · Glisser : addition"><span aria-hidden="true">●</span><small aria-hidden="true">L${i+1}</small></button><div class="sys-equation" role="group" aria-label="Ligne ${i+1} : ${escape(rowText(r))}">${equationHTML(r,i)}</div></div>`).join('')}<button type="button" id="sys-validate" class="primary sys-validate" aria-label="Valider le système" title="Valider le système">${check}</button>${this.wheelRow!==null?`<div class="sys-inline-wheel"><button type="button" id="sys-gear" class="sys-gear" aria-label="Tourner la roue pour ${this.options.data.wheelMode==='divide'?'diviser':'multiplier'} L${this.wheelRow+1}. Flèches gauche et droite disponibles."><svg viewBox="0 0 44 44" aria-hidden="true"><g>${Array.from({length:12},(_,i)=>`<rect x="18.5" y="1" width="7" height="9" rx="1.5" transform="rotate(${i*30} 22 22)"/>`).join('')}<circle cx="22" cy="22" r="15"/></g><circle class="sys-gear-hole" cx="22" cy="22" r="6"/></svg></button><label class="sys-inline-number"><span>${this.options.data.wheelMode==='divide'?'÷':'×'} L${this.wheelRow+1}</span><input id="sys-wheel-input" aria-label="${this.options.data.wheelMode==='divide'?'Diviseur':'Multiplicateur'} entier pour la ligne ${this.wheelRow+1}" inputmode="text" autocomplete="off" maxlength="10" placeholder="…"></label><small class="sys-inline-hint">Tourne, puis relâche</small><button type="button" id="sys-wheel-close" class="text-button" aria-label="Fermer la roue">×</button></div>`:''}<p class="sys-drag-caption" aria-live="polite"></p></div><div class="sys-action-panel context-panel"><div class="selection-caption"><span>SÉLECTION</span><span>${this.selection?`Ligne ${this.selection.row+1}${this.selection.variable!==undefined?` · ${variables[this.selection.variable]}`:''}`:'Choisis un point ou une inconnue'}</span></div><div class="context-actions">${this.selectedActions()}</div></div><p class="sys-feedback" role="status">${escape(this.feedback||l.tip)}</p><div class="sys-controls">${btn('sys-undo','↶ Annuler','utility',g.events.length?'':'disabled')}${btn('sys-hint','◉ Indice','utility')}${btn('sys-history','≡ Étapes','utility')}${btn('sys-restart','Recommencer','text-button')}</div><p class="sys-notes">${g.errors} erreur${g.errors>1?'s':''} · ${g.hints} indice${g.hints>1?'s':''}<span>Point : molette ou glissement · Terme : changer de membre</span></p></section>`);
        this.on('#sys-back',()=>this.map());this.on('#sys-rule',()=>this.rule());this.bindMode();
        this.on('[data-system-term]',e=>{
            const b=e.currentTarget as HTMLElement,row=Number(b.dataset.row),side=b.dataset.side as Side,term=b.dataset.writtenTerm===undefined?undefined:Number(b.dataset.writtenTerm),variable=b.dataset.variable===undefined?undefined:Number(b.dataset.variable),old=this.selection;
            const terms=term===undefined?undefined:old?.row===row&&old.side===side&&old.terms&&!old.part?(old.terms.includes(term)?old.terms.filter(i=>i!==term):[...old.terms,term]):[term];
            const active=terms?.length===1?simpleTerm(writtenTerm(this.game!.rows[row],side,terms[0])):null;
            this.selection=terms?.length===0?null:{row,side,variable:terms?.length===1?(active?.variable??undefined):variable,constant:terms?.length===1?active?.variable===null:b.dataset.systemTerm==='constant',term:terms?.at(-1),terms};this.options.sound('tap');this.renderGame();
        });
        this.on('#sys-clear-selection',()=>{this.selection=null;this.renderGame();});
        this.on('#sys-expand',()=>{const s=this.selection!;this.act({kind:'expand',row:s.row,side:s.side!,term:s.term!});});
        this.on('#sys-merge',()=>{const s=this.selection!;this.act({kind:'merge',row:s.row,side:s.side!,terms:s.terms!});});
        this.on('#sys-multiply',()=>this.openWheel(this.selection!.row));
        this.on('#sys-negate',()=>this.act(scaleByInteger(this.selection!.row,'multiply','-1')));
        this.on('[data-pick-system-factor]',e=>{this.selection!.part=(e.currentTarget as HTMLElement).dataset.pickSystemFactor as FactorPart;this.feedback='Facteur sélectionné : glisse-le dans l’autre membre.';this.renderGame();});
        this.on('#sys-apply-factor',()=>{const s=this.selection!;this.act(factorAction(s.row,this.game!.rows[s.row],s.side!,s.constant||s.variable===undefined?null:s.variable,s.part!,s.term));});
        this.on('[data-offset]',e=>{try{const q=readRational(document.querySelector<HTMLInputElement>('#sys-offset-value')!.value.replaceAll('−','-'));this.act({kind:'offset',row:this.selection!.row,operand:str((e.currentTarget as HTMLElement).dataset.offset==='subtract'?neg(q):q)});}catch{this.feedback='Écris un nombre ou une fraction, par exemple −2 ou 3/4.';document.querySelector('.sys-feedback')!.textContent=this.feedback;}});
        this.on('#sys-move-term',()=>this.act(this.selectedMove()));
        this.on('[data-substitute]',e=>this.act({kind:'substitute',row:this.selection!.row,variable:Number((e.currentTarget as HTMLElement).dataset.substitute)}));
        this.on('[data-add]',e=>this.act({kind:'add',source:this.selection!.row,target:Number((e.currentTarget as HTMLElement).dataset.add)}));
        this.on('#sys-validate',()=>this.validate());this.on('#sys-undo',()=>this.undo());this.on('#sys-hint',()=>this.hint());this.on('#sys-history',()=>this.history());
        this.on('#sys-restart',()=>{this.modal('Recommencer ce système ?',`<p>Ta progression dans les autres niveaux reste conservée.</p>${btn('sys-confirm-restart','Recommencer','primary')}`);this.on('#sys-confirm-restart',()=>this.open(g.level));});
        if(this.selection?.part){const s=this.selection,term=document.querySelector<HTMLElement>(`[data-system-row="${s.row}"] ${s.term!==undefined?`[data-written-term="${s.term}"]`:`[data-system-term="${s.constant?'constant':s.variable}"]`}[data-side="${s.side}"]`);(term?.querySelector(`[data-system-grip="${s.part}"]`)??term)?.classList.add('sys-factor-selected');}
        if(this.selection?.terms){const s=this.selection;for(const term of s.terms!)document.querySelector(`[data-system-row="${s.row}"] [data-side="${s.side}"][data-written-term="${term}"]`)?.classList.add('sys-term-selected');}
        this.bindHandles();this.bindTermDrags();this.bindSize();if(this.wheelRow!==null)this.bindInlineWheel();
    }
    private bindSize(){
        const board=document.querySelector<HTMLElement>('#sys-board')!;
        let width=0;
        const fit=()=>{if(!board.isConnected)return;board.style.setProperty('--sys-scale','1');board.style.removeProperty('--sys-columns');
            const font=parseFloat(getComputedStyle(board).fontSize);
            let scale=1;for(let pass=0;pass<3;pass++){
                const ratios=[...board.querySelectorAll<HTMLElement>('.sys-side')].map(side=>side.clientWidth/Math.max(1,side.firstElementChild!.getBoundingClientRect().width));
                const ratio=Math.min(...ratios);if(ratio>=.995)break;
                scale=Math.max(12/font,scale*ratio*.99);board.style.setProperty('--sys-scale',String(scale));
            }
            width=board.clientWidth;
        };
        this.fitBoard=fit;
        const schedule=()=>{if(!this.frame)this.frame=requestAnimationFrame(()=>{this.frame=0;fit();});};
        this.sizeObserver=new ResizeObserver(()=>{if(board.clientWidth!==width)schedule();});this.sizeObserver.observe(board);window.addEventListener('resize',schedule,{signal:this.abort!.signal,passive:true});
        void document.fonts.ready.then(()=>{if(board.isConnected)schedule();});fit();
    }
    private modal(title:string,body:string){
        document.querySelector('.sys-modal')?.remove();const modal=document.createElement('dialog');modal.className='sys-modal';modal.setAttribute('aria-labelledby','sys-modal-title');modal.innerHTML=`<header><h2 id="sys-modal-title">${escape(title)}</h2>${btn('sys-modal-close','×','icon-button','aria-label="Fermer la fenêtre"')}</header>${body}`;document.body.append(modal);modal.showModal();
        const close=()=>modal.close();modal.querySelector('#sys-modal-close')!.addEventListener('click',close);modal.addEventListener('close',()=>modal.remove(),{once:true});modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});return modal;
    }
    private openWheel(row:number){if(!this.game)return;this.wheelRow=row;this.selection={row};this.renderGame();}
    private bindInlineWheel(){
        const gear=document.querySelector<HTMLElement>('#sys-gear')!,input=document.querySelector<HTMLInputElement>('#sys-wheel-input')!,board=document.querySelector<HTMLElement>('#sys-board')!,root=document.querySelector<HTMLElement>('.sys-game')!,signal=this.abort!.signal,row=this.wheelRow!;
        let base=copyRows(this.game!.rows),pending:SystemAction|null=null,pointer:number|null=null,angle=0,total=0,steps=0,frame=0,timer=0,centre={x:0,y:0},previewing=false;
        const controls=()=>root.querySelectorAll<HTMLElement>('.sys-controls,.sys-action-panel,.sys-heading,.sys-default-wheel,#sys-validate');
        const lock=(value:boolean)=>{previewing=value;root.dataset.adjusting=String(value);controls().forEach(el=>el.inert=value);};
        const restore=()=>{const equation=board.querySelector<HTMLElement>(`[data-system-row="${row}"] .sys-equation`);if(equation){equation.innerHTML=equationHTML(base[row],row);equation.setAttribute('aria-label',`Ligne ${row+1} : ${rowText(base[row])}`);}lock(false);cancelAnimationFrame(frame);clearTimeout(timer);};
        const cleanup=()=>{restore();if(pointer!==null&&gear.hasPointerCapture(pointer))gear.releasePointerCapture(pointer);pointer=null;pending=null;};
        const previous=this.stopGesture;this.stopGesture=()=>{previous?.();cleanup();};
        const preview=(operand:string)=>{pending=null;input.value=operand;try{const action=scaleByInteger(row,this.options.data.wheelMode,operand),rows=transformSystem(base,action);board.querySelector(`[data-system-row="${row}"] .sys-equation`)!.innerHTML=equationHTML(rows[row],row,false);board.querySelector(`[data-system-row="${row}"] .sys-equation`)!.setAttribute('aria-label',`Aperçu de L${row+1} : ${rowText(rows[row])}`);pending=action;input.setAttribute('aria-invalid','false');lock(true);this.options.sound('tap');}catch{board.querySelector(`[data-system-row="${row}"] .sys-equation`)!.innerHTML=equationHTML(base[row],row);input.setAttribute('aria-invalid',String(!!operand));}if(!frame)frame=requestAnimationFrame(()=>{frame=0;this.fitBoard?.();});};
        const fromSteps=()=>{const operand=steps>0?steps+1:steps<0?steps:null;preview(operand===null?'':String(operand));gear.querySelector('svg')!.style.transform=`rotate(${total*180/Math.PI}deg)`;};
        const commit=()=>{const action=pending;cleanup();if(action)this.act(action,true);else{input.value='';this.renderGame();}};
        const cancel=()=>{cleanup();this.renderGame();};
        this.on('#sys-wheel-close',()=>{cancel();this.wheelRow=null;this.renderGame();});
        input.addEventListener('input',()=>{if(!previewing)base=copyRows(this.game!.rows);preview(input.value);},{signal});
        input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();commit();}else if(e.key==='Escape'){e.preventDefault();cancel();}},{signal});
        input.addEventListener('blur',()=>{if(previewing&&pointer===null)commit();},{signal});
        gear.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();base=copyRows(this.game!.rows);const r=gear.getBoundingClientRect();centre={x:r.x+r.width/2,y:r.y+r.height/2};pointer=event.pointerId;angle=Math.atan2(event.clientY-centre.y,event.clientX-centre.x);total=0;steps=0;pending=null;gear.setPointerCapture(pointer);lock(true);},{signal});
        window.addEventListener('pointermove',event=>{if(pointer!==event.pointerId)return;if(event.cancelable)event.preventDefault();const next=Math.atan2(event.clientY-centre.y,event.clientX-centre.x);let delta=next-angle;if(delta>Math.PI)delta-=Math.PI*2;if(delta< -Math.PI)delta+=Math.PI*2;total+=delta;angle=next;const nextSteps=Math.trunc(total/(Math.PI/12));if(nextSteps!==steps){steps=nextSteps;fromSteps();}},{signal,passive:false});
        window.addEventListener('pointerup',event=>{if(pointer===event.pointerId)commit();},{signal});
        gear.addEventListener('wheel',event=>{event.preventDefault();if(!previewing){base=copyRows(this.game!.rows);steps=0;}steps+=event.deltaY>0?1:-1;total=steps*Math.PI/12;fromSteps();clearTimeout(timer);timer=window.setTimeout(commit,240);},{signal,passive:false});
        gear.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();base=copyRows(this.game!.rows);steps=['ArrowRight','ArrowUp'].includes(event.key)?1:-1;fromSteps();commit();},{signal});
        window.addEventListener('keydown',event=>{if(event.key==='Escape'&&previewing)cancel();},{signal});window.addEventListener('pointercancel',cancel,{signal});window.addEventListener('equation-multitouch',cancel,{signal});window.addEventListener('resize',()=>{if(previewing)cancel();},{signal,passive:true});document.addEventListener('visibilitychange',()=>{if(document.hidden&&previewing)cancel();},{signal});
    }
    private act(action:SystemAction,confirmed=false){
        if(!this.game||this.result)return;
        try{
            if(this.game.events.length>=200)throw Error('Tu as atteint 200 étapes. Recommence ce système pour repartir simplement.');
            const next=transformSystem(this.game.rows,action);
            if(this.options.explain()&&!confirmed){this.modal('Transformer le système',`<p>${escape(actionLabel(action))}</p><div class="sys-preview-list">${next.map((r,i)=>`<div class="sys-equation">${equationHTML(r,i,false)}</div>`).join('')}</div><p>${action.kind==='substitute'?'La ligne qui définit l’inconnue est conservée. Son expression remplace cette inconnue dans toutes les autres équations.':action.kind==='add'?'Les membres correspondants sont additionnés. La ligne de départ est conservée ; la ligne d’arrivée est remplacée.':action.kind==='move'||action.kind==='written-move'?'Le terme change de membre avec son opposé.':action.kind==='offset'?'Le même nombre est ajouté aux deux membres.':action.kind==='expand'?'Seule l’expression sélectionnée est développée ou calculée.':action.kind==='merge'?'Seuls les termes sélectionnés sont fusionnés.':'Les deux membres sont multipliés ou divisés par le même nombre non nul.'}</p>${btn('sys-confirm-action','Appliquer','primary')}`);this.on('#sys-confirm-action',()=>this.act(action,true));return;}
            if(action.kind!=='scale')this.wheelRow=null;
            this.game.rows=next;this.game.events.push(action);this.game.moves++;this.feedback=actionLabel(action);this.selection=action.kind==='add'?{row:action.target}:null;
            this.persist();this.options.sound(action.kind==='add'||action.kind==='substitute'?'merge':'drop');this.renderGame();
            if(action.kind==='add')document.querySelector(`[data-system-row="${action.target}"]`)?.classList.add('sys-merged');
        }catch(e){this.game.errors++;this.feedback=(e as Error).message;this.persist();this.renderGame();}
    }
    private undo(){if(!this.game?.events.length)return;const g=this.game,events=g.events.slice(0,-1),fresh=newSystemGame(g.level);for(const event of events)fresh.rows=transformSystem(fresh.rows,event);this.game={...fresh,events,moves:g.moves,hints:g.hints,errors:g.errors};this.selection=null;this.feedback='Dernière transformation annulée.';this.persist();this.options.sound('cancel');this.renderGame();}
    private validate(){if(!this.game)return;try{
        this.result=verifySystem(this.game.rows,this.level.rows);const g=this.game,l=this.level,score=g.errors===0&&g.hints===0&&g.moves<=l.budget?3:g.errors<=1&&g.hints<=1&&g.moves<=l.budget*1.5?2:1,old=this.options.data.results[l.id];
        if(!old||score>old.stars||score===old.stars&&g.moves<old.moves)this.options.data.results[l.id]={stars:score,moves:g.moves,hints:g.hints,errors:g.errors};
        this.resultStars=score;this.persist();this.options.sound('win');this.renderResult();window.scrollTo(0,0);
    }catch(e){this.game.errors++;this.feedback=(e as Error).message;this.persist();this.renderGame();}}
    private renderResult(){if(!this.result||!this.game)return;this.showingGame=false;const index=systemLevels.findIndex(l=>l.id===this.game!.level),score=this.resultStars;
        this.paint(`<section class="sys-result"><div class="result-seal">${this.result.kind==='none'?'∅':this.result.kind==='infinite'?'∞':'✓'}</div><p class="eyebrow">SYSTÈME RÉSOLU</p><h1>${this.result.kind==='none'?'Impossible, et démontré.':this.result.kind==='infinite'?'Une infinité de solutions.':'Les inconnues sont libérées.'}</h1>${stars(score)}<div class="sys-solution" role="math" aria-label="${escape(solutionText(this.result))}">${solutionHTML(this.result)}</div><p>${this.result.kind==='unique'?`Coordonnées dans l’ordre ${variables.slice(0,this.game.rows[0].coefficients.length).join(', ')}.`:this.result.kind==='none'?'Une égalité impossible ne peut être satisfaite.':'Une équation dépendait des autres : au moins un paramètre reste libre.'}</p><div class="sys-result-next">${btn('sys-next',index+1<systemLevels.length?'Continuer →':'Tous les niveaux →','primary')}</div><div class="sys-result-stats"><span><b>${this.game.moves}</b> transformations</span><span><b>${this.game.errors}</b> erreurs</span><span><b>${this.game.hints}</b> indices</span></div><div class="sys-result-links">${btn('sys-replay','↶ Rejouer','secondary')}${btn('sys-result-map','Les niveaux','text-button')}</div></section>`);
        this.on('#sys-next',()=>index+1<systemLevels.length?this.open(systemLevels[index+1].id):this.map());this.on('#sys-replay',()=>this.open(this.game!.level));this.on('#sys-result-map',()=>this.map());
    }
    private hint(){if(!this.game)return;this.game.hints++;this.persist();const hint=systemHint(this.game.rows,this.level.method);this.feedback=hint.text;this.renderGame();this.modal('Un indice pour continuer',`<p>${escape(hint.text)}</p><p class="muted">À toi de choisir la ligne et d’effectuer le geste.</p>`);}
    private history(){if(!this.game)return;let rows=copyRows(this.level.rows);const items=[`<li><strong>Départ</strong>${rows.map((r,i)=>`<div class="sys-equation">${equationHTML(r,i,false)}</div>`).join('')}</li>`];for(const action of this.game.events){rows=transformSystem(rows,action);items.push(`<li><strong>${escape(actionLabel(action))}</strong>${rows.map((r,i)=>`<div class="sys-equation">${equationHTML(r,i,false)}</div>`).join('')}</li>`);}this.modal('Ton chemin dans le système',`<p>Les annulations conservent le nombre de transformations tentées.</p><ol class="sys-history">${items.join('')}</ol>`);}
    private rule(){this.modal('Les lignes gardent le même équilibre',`<ul><li>Touche le point d’une ligne : la molette multiplie ou divise ses deux membres par le nombre choisi. 0 et 1 sont exclus ; les entiers négatifs sont autorisés. Utilise ÷ 2 plutôt que × 1/2.</li><li>Glisse le point de la ligne sur une autre : leurs membres s’additionnent. La ligne d’arrivée change, celle de départ reste conservée.</li><li>Un appui prolongé sur un coefficient permet de le saisir ; sur x dans une fraction, il prend le coefficient complet, sur le dénominateur, il prend celui-ci. Glisse le facteur dans l’autre membre : tous les termes de cette ligne sont divisés (ou multipliés pour un dénominateur). Les autres lignes restent inchangées.</li><li>Sélectionne un terme pour ajouter ou soustraire un nombre aux deux membres de sa ligne, ou les multiplier par −1.</li><li>Déplace les termes entre les membres et utilise la molette pour isoler toi-même une inconnue. Sélectionne ensuite cette inconnue et choisis « Substituer ». Son expression la remplace dans toutes les autres équations.</li><li>Après substitution, l’expression est conservée telle quelle. Sélectionne un produit pour le développer ou le calculer. Touche deux termes semblables pour les fusionner.</li><li>Valide quand chaque inconnue est isolée, ou qu’une égalité permet de conclure.</li></ul><p>Au clavier : sélectionne une inconnue pour accéder aux commandes de sa ligne. Échap annule un déplacement.</p>`);}
    private bindTermDrags(){
        const board=document.querySelector<HTMLElement>('#sys-board')!,root=document.querySelector<HTMLElement>('.sys-game')!,signal=this.abort!.signal;
        type Pointer={id:number;row:number;side:Side;variable:number|null;x:number;y:number;startX:number;startY:number;button:HTMLElement;part?:FactorPart;term?:number;held?:boolean};
        let pointer:Pointer|null=null,active=false,ghost:HTMLElement|null=null,frame=0,timer=0,crossed=false,suppress=0,equal:HTMLElement|null=null,equalText='',equalRect:DOMRect|null=null,targetRect:DOMRect|null=null,source:HTMLElement|null=null,sourceHTML='';
        const controls=()=>root.querySelectorAll<HTMLElement>('.sys-controls,.sys-action-panel,.sys-heading,.sys-default-wheel,#sys-validate');
        const actionFor=(p:Pointer):SystemAction=>p.part?factorAction(p.row,this.game!.rows[p.row],p.side,p.variable,p.part,p.term):p.term!==undefined?{kind:'written-move',row:p.row,side:p.side,term:p.term}:{kind:'move',row:p.row,side:p.side,variable:p.variable};
        const cleanup=()=>{
            clearTimeout(timer);cancelAnimationFrame(frame);ghost?.remove();ghost=null;
            if(source){source.innerHTML=sourceHTML;source=null;}
            if(equal){equal.textContent=equalText;equal.removeAttribute('aria-label');}equal=null;
            root.dataset.dragging='false';controls().forEach(el=>el.inert=false);
            board.querySelectorAll('.sys-term-lifted,.sys-member-target').forEach(el=>el.classList.remove('sys-term-lifted','sys-member-target'));
            if(pointer&&board.hasPointerCapture(pointer.id))board.releasePointerCapture(pointer.id);
            pointer=null;active=false;crossed=false;
        };
        const cancel=()=>{const preview=!!source;if(active){suppress=performance.now()+550;this.options.sound('cancel');}cleanup();if(preview&&board.isConnected)this.renderGame();};
        const prior=this.stopGesture;this.stopGesture=()=>{prior?.();cleanup();};
        const ghostHTML=()=>{
            if(!pointer)return '';
            if(!pointer.part)return pointer.term!==undefined?carriedWrittenTerm(this.game!.rows[pointer.row],pointer.side,pointer.term,crossed):carriedTerm(this.game!.rows[pointer.row],pointer.side,pointer.variable,crossed);
            const q=factorValue(this.game!.rows[pointer.row],pointer.side,pointer.variable,pointer.part,pointer.term),value=qMath(q);
            return crossed?`${pointer.part==='denominator'?'×':'÷'} ${q.n<0n?`(${value})`:value}`:value;
        };
        const draw=()=>{
            frame=0;if(!pointer||!ghost||!equalRect)return;
            ghost.style.transform=`translate3d(${pointer.x}px,${pointer.y-30}px,0) translate(-50%,-50%)`;
            const next=pointer.side==='left'?pointer.x>equalRect.x+equalRect.width/2:pointer.x<equalRect.x+equalRect.width/2;
            if(next!==crossed){crossed=next;ghost.innerHTML=ghostHTML();ghost.classList.toggle('changed-sign',crossed);this.options.sound('cross');}
        };
        const begin=()=>{
            clearTimeout(timer);if(!pointer||active)return;
            active=true;crossed=false;this.options.sound('lift');
            const line=pointer.button.closest<HTMLElement>('[data-system-row]')!,destination=pointer.side==='left'?'right':'left',font=getComputedStyle(pointer.button).font;
            equal=line.querySelector<HTMLElement>('.sys-equal')!;equalText=equal.textContent!;equalRect=equal.getBoundingClientRect();targetRect=line.querySelector<HTMLElement>(`.sys-${destination}`)!.getBoundingClientRect();
            line.querySelector(`.sys-${destination}`)!.classList.add('sys-member-target');equal.textContent='↝';equal.setAttribute('aria-label','Transformation en cours');
            board.setPointerCapture(pointer.id);
            if(pointer.part){
                const next=transformSystem(this.game!.rows,actionFor(pointer));
                source=line.querySelector<HTMLElement>(`.sys-${pointer.side} .sys-expression`)!;sourceHTML=source.innerHTML;
                source.innerHTML=rowSides(next[pointer.row],pointer.row,false)[pointer.side==='left'?0:1];this.fitBoard?.();targetRect=line.querySelector<HTMLElement>(`.sys-${destination}`)!.getBoundingClientRect();
            }else pointer.button.classList.add('sys-term-lifted');
            root.dataset.dragging='true';controls().forEach(el=>el.inert=true);
            ghost=document.createElement('div');ghost.className='sys-term-ghost';ghost.dataset.part=pointer.part??'term';ghost.style.font=font;ghost.innerHTML=ghostHTML();document.body.append(ghost);draw();
        };
        board.addEventListener('click',e=>{if(performance.now()<suppress){e.preventDefault();e.stopImmediatePropagation();}},{signal,capture:true});
        this.on('[data-system-term]',event=>{
            const e=event as PointerEvent;if(e.button!==0||root.dataset.adjusting==='true')return;if(pointer){cancel();return;}
            const button=e.currentTarget as HTMLElement,row=Number(button.dataset.row),side=button.dataset.side as Side,variable=button.dataset.variable===undefined?null:Number(button.dataset.variable),term=button.dataset.writtenTerm===undefined?undefined:Number(button.dataset.writtenTerm),selected=this.selection;
            const picked=selected?.row===row&&selected.side===side&&selected.term===term&&(selected.variable??null)===variable?selected.part:undefined;
            pointer={id:e.pointerId,row,side,variable,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,button,part:picked,term};
            const grip=(e.target as HTMLElement).closest<HTMLElement>('[data-system-grip]')?.dataset.systemGrip as FactorPart|undefined;
            let part=picked??grip??'coefficient';
            if(part==='numerator'&&factorValueSafe(this.game!.rows[row],side,variable,'denominator',term)===null)part='coefficient';
            try{factorValue(this.game!.rows[row],side,variable,part,term);timer=window.setTimeout(()=>{if(pointer){pointer.part=part;pointer.held=true;begin();}},420);}catch{ /* Unit coefficient: the complete term can still move. */ }
        },'pointerdown');
        window.addEventListener('pointermove',e=>{
            if(!pointer||pointer.id!==e.pointerId)return;pointer.x=e.clientX;pointer.y=e.clientY;
            if(!active&&Math.hypot(pointer.x-pointer.startX,pointer.y-pointer.startY)>6)begin();
            if(active){if(e.cancelable)e.preventDefault();if(!frame)frame=requestAnimationFrame(draw);}
        },{signal,passive:false});
        window.addEventListener('pointerup',e=>{
            if(!pointer||pointer.id!==e.pointerId)return;clearTimeout(timer);if(!active){pointer=null;return;}
            pointer.x=e.clientX;pointer.y=e.clientY;draw();const p=pointer,action=actionFor(p),preview=!!source;
            const valid=crossed&&!!targetRect&&e.clientX>=targetRect.left&&e.clientX<=targetRect.right&&e.clientY>=targetRect.top&&e.clientY<=targetRect.bottom;
            const picked=p.part&&p.held&&Math.hypot(p.x-p.startX,p.y-p.startY)<6;
            suppress=performance.now()+550;cleanup();
            if(valid)this.act(action);
            else if(picked){this.selection={row:p.row,side:p.side,variable:p.variable??undefined,constant:p.variable===null&&p.button.dataset.systemTerm==='constant',part:p.part,term:p.term,terms:p.term===undefined?undefined:[p.term]};this.feedback='Facteur sélectionné : glisse-le dans l’autre membre.';this.renderGame();}
            else{this.options.sound('cancel');if(preview)this.renderGame();}
        },{signal});
        window.addEventListener('pointerdown',e=>{if(pointer&&e.pointerId!==pointer.id)cancel();},{signal,capture:true});
        window.addEventListener('equation-multitouch',cancel,{signal});window.addEventListener('pointercancel',cancel,{signal});window.addEventListener('resize',cancel,{signal,passive:true});
        window.addEventListener('keydown',e=>{if(e.key==='Escape'&&pointer)cancel();},{signal});document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();},{signal});
    }
    private bindHandles(){
        const board=document.querySelector<HTMLElement>('#sys-board')!,root=document.querySelector<HTMLElement>('.sys-game')!,signal=this.abort!.signal;
        const touches=new Set<number>();
        let pointer:{id:number;source:number;startX:number;startY:number;x:number;y:number;handle:HTMLElement}|null=null,timer=0,raf=0,dragging=false,target=-1,suppress=0,ghost:HTMLElement|null=null,rects:DOMRect[]=[],grabX=0,grabY=0;
        const locks=()=>root.querySelectorAll<HTMLElement>('.sys-controls,.sys-action-panel,.sys-heading,.sys-default-wheel,#sys-validate');
        const cleanup=()=>{clearTimeout(timer);cancelAnimationFrame(raf);ghost?.remove();ghost=null;root.dataset.dragging='false';locks().forEach(el=>el.inert=false);board.querySelectorAll('.sys-source,.sys-target').forEach(el=>el.classList.remove('sys-source','sys-target'));board.querySelector('.sys-drag-caption')!.textContent='';if(pointer&&pointer.handle.hasPointerCapture(pointer.id))pointer.handle.releasePointerCapture(pointer.id);pointer=null;dragging=false;target=-1;};
        const cancel=()=>{if(dragging){suppress=performance.now()+550;this.options.sound('cancel');}cleanup();};const previousCleanup=this.stopGesture;this.stopGesture=()=>{previousCleanup?.();cleanup();};
        const draw=()=>{raf=0;if(!pointer||!ghost)return;ghost.style.transform=`translate3d(${pointer.x-grabX}px,${pointer.y-grabY}px,0)`;const next=rects.findIndex((r,i)=>i!==pointer!.source&&pointer!.x>=r.left&&pointer!.x<=r.right&&pointer!.y>=r.top&&pointer!.y<=r.bottom);if(next!==target){target=next;board.querySelectorAll<HTMLElement>('[data-system-row]').forEach((el,i)=>el.classList.toggle('sys-target',i===target));board.querySelector('.sys-drag-caption')!.textContent=target<0?'Dépose la ligne sur une autre équation.':`L${target+1} ← L${target+1} + L${pointer.source+1}`;if(target>=0)this.options.sound('cross');}};
        const begin=()=>{if(!pointer)return;dragging=true;this.options.sound('lift');rects=[...board.querySelectorAll<HTMLElement>('[data-system-row]')].map(el=>el.getBoundingClientRect());root.dataset.dragging='true';locks().forEach(el=>el.inert=true);board.querySelector(`[data-system-row="${pointer.source}"]`)!.classList.add('sys-source');const source=board.querySelector<HTMLElement>(`[data-system-row="${pointer.source}"]`)!,sourceRect=source.getBoundingClientRect(),style=getComputedStyle(source);grabX=pointer.startX-sourceRect.left;grabY=pointer.startY-sourceRect.top;ghost=document.createElement('div');ghost.className='sys-row-ghost';ghost.setAttribute('aria-hidden','true');ghost.inert=true;ghost.style.width=`${sourceRect.width}px`;ghost.style.minHeight=`${sourceRect.height}px`;ghost.style.gridTemplateColumns=style.gridTemplateColumns;ghost.style.columnGap=style.columnGap;ghost.style.padding=style.padding;ghost.style.setProperty('--sys-base',getComputedStyle(board).getPropertyValue('--sys-base'));ghost.style.setProperty('--sys-scale',getComputedStyle(board).getPropertyValue('--sys-scale'));ghost.style.setProperty('--sys-columns',getComputedStyle(board).getPropertyValue('--sys-columns'));ghost.innerHTML=source.innerHTML;document.body.append(ghost);pointer.handle.setPointerCapture(pointer.id);draw();};
        this.on('[data-handle]',e=>{if(performance.now()<suppress)return;const source=Number((e.currentTarget as HTMLElement).dataset.handle);this.options.sound('tap');this.openWheel(source);});
        this.on('[data-handle]',e=>{const event=e as PointerEvent;if(event.button!==0||touches.size>1||root.dataset.adjusting==='true')return;if(pointer){cancel();return;}const handle=e.currentTarget as HTMLElement;pointer={id:event.pointerId,source:Number(handle.dataset.handle),startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY,handle};timer=window.setTimeout(begin,420);},'pointerdown');
        window.addEventListener('pointerdown',e=>{touches.add(e.pointerId);if(pointer&&e.pointerId!==pointer.id)cancel();},{signal,capture:true});
        window.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;pointer.x=e.clientX;pointer.y=e.clientY;if(!dragging){if(Math.hypot(pointer.x-pointer.startX,pointer.y-pointer.startY)>6){clearTimeout(timer);begin();}return;}if(e.cancelable)e.preventDefault();if(!raf)raf=requestAnimationFrame(draw);},{signal,passive:false});
        window.addEventListener('pointerup',e=>{touches.delete(e.pointerId);if(!pointer||pointer.id!==e.pointerId)return;if(!dragging){clearTimeout(timer);pointer=null;return;}pointer.x=e.clientX;pointer.y=e.clientY;draw();const source=pointer.source,destination=target;suppress=performance.now()+550;cleanup();if(destination>=0)this.act({kind:'add',source,target:destination});else this.options.sound('cancel');},{signal});
        window.addEventListener('equation-multitouch',cancel,{signal});window.addEventListener('pointercancel',e=>{touches.delete(e.pointerId);cancel();},{signal});window.addEventListener('resize',cancel,{signal,passive:true});window.addEventListener('keydown',e=>{if(e.key==='Escape'&&pointer){suppress=performance.now()+550;cancel();}},{signal});document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();},{signal});
    }
}
