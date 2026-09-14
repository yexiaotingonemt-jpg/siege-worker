export class AudioBus{
 ctx:AudioContext|null=null;muted=false;last=0;
 enable(){if(!this.ctx)this.ctx=new AudioContext();void this.ctx.resume();}
 play(kind:string){if(this.muted||!this.ctx)return;const t=this.ctx.currentTime;if(kind==='cannon'&&t-this.last<.1)return;this.last=t;
 const frequencies:Record<string,number[]>={build:[180],complete:[440,660],upgrade:[330,440,660],active:[260,520],reward:[660,880],level:[440,550,880],wave:[160,220],boss:[100,80],warning:[320,250],hurt:[110],cannon:[70],lost:[180,130,80],won:[330,440,550,660]};
 for(const [i,f] of (frequencies[kind]||[220]).entries()){const o=this.ctx.createOscillator(),gain=this.ctx.createGain();o.type=kind==='hurt'||kind==='cannon'?'triangle':'sine';o.frequency.setValueAtTime(f,t+i*.07);o.frequency.exponentialRampToValueAtTime(f*.75,t+i*.07+.15);gain.gain.setValueAtTime(0,t+i*.07);gain.gain.linearRampToValueAtTime(kind==='cannon'?.025:.045,t+i*.07+.01);gain.gain.exponentialRampToValueAtTime(.001,t+i*.07+.18);o.connect(gain);gain.connect(this.ctx.destination);o.start(t+i*.07);o.stop(t+i*.07+.2);}
 }
}
