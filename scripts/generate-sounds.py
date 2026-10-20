"""Original pentatonic glass/pluck cues. Requires ffmpeg; no sampled music."""
import math, wave, struct, subprocess, pathlib, tempfile, json
RATE = 44100
C5, D5, E5, G5, A5, C6 = 523.251, 587.330, 659.255, 783.991, 880.0, 1046.502
CUES = {
 'tap': [(0,E5,.12,.24)],
 'lift': [(0,C5,.17,.23),(.055,E5,.18,.19)],
 'cross': [(0,G5,.14,.20),(.047,A5,.17,.17)],
 'drop': [(0,G5,.15,.21)],
 'merge': [(0,E5,.17,.22),(.045,G5,.17,.19),(.09,C6,.24,.20)],
 'win': [(0,C5,.26,.24),(.09,E5,.28,.22),(.18,G5,.30,.20),(.30,C6,.42,.23)],
 'cancel': [(0,E5,.12,.17),(.055,D5,.17,.15)],
}
root=pathlib.Path(__file__).resolve().parent.parent/'public'/'audio';root.mkdir(exist_ok=True)
report=[]
with tempfile.TemporaryDirectory(prefix='equation-sounds-') as tmp:
 for name, notes in CUES.items():
  duration=max(start+length for start,_,length,_ in notes)+.15
  mono=[0.0]*int(duration*RATE)
  for start,freq,length,amplitude in notes:
   for i in range(int(length*RATE)):
    t=i/RATE; attack=min(1,t/.007); release=min(1,(length-t)/.035)
    env=attack*release*math.exp(-5.5*t/length)
    tone=math.sin(2*math.pi*freq*t)+.18*math.sin(2*math.pi*freq*2*t)*math.exp(-10*t)+.045*math.sin(2*math.pi*freq*3*t)*math.exp(-18*t)
    mono[int(start*RATE)+i]+=amplitude*env*tone
  peak=0.0; samples=[]
  for i,dry in enumerate(mono):
   left=dry+(mono[i-int(.073*RATE)]*.12 if i>=int(.073*RATE) else 0)
   right=dry+(mono[i-int(.091*RATE)]*.10 if i>=int(.091*RATE) else 0)
   fade=min(1,(len(mono)-1-i)/(.025*RATE));left*=fade;right*=fade
   peak=max(peak,abs(left),abs(right));samples.extend([round(left*32767),round(right*32767)])
  wav=pathlib.Path(tmp)/(name+'.wav')
  with wave.open(str(wav),'wb') as out:
   out.setnchannels(2);out.setsampwidth(2);out.setframerate(RATE);out.writeframes(struct.pack('<'+'h'*len(samples),*samples))
  for extension,codec in [('ogg',['-c:a','libopus','-b:a','48k']),('mp3',['-c:a','libmp3lame','-b:a','64k'])]:
   subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),*codec,str(root/(name+'.'+extension))],check=True)
  report.append({'name':name,'seconds':round(duration,3),'peak':round(peak,3),'oggBytes':(root/(name+'.ogg')).stat().st_size,'mp3Bytes':(root/(name+'.mp3')).stat().st_size})
(root/'SOURCES.txt').write_text('Original melodic cues created for Equation Breaker. Synthesized from sine harmonics by scripts/generate-sounds.py. Distributed under the project MIT license. OGG/Opus with MP3 fallback.\n')
print(json.dumps(report,indent=2))
