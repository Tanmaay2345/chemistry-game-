const hex=h=>{h=h.replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16));};
const lin=c=>{c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
const L=h=>{const [r,g,b]=hex(h).map(lin);return 0.2126*r+0.7152*g+0.0722*b;};
const ratio=(a,b)=>{const l1=L(a),l2=L(b);return ((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05));};
const f=n=>n.toFixed(2);

console.log('--- CONTRAST (vs #ffffff unless noted) ---');
const pairs=[
 ['body grey #6d6d6d on white','#6d6d6d','#ffffff','instruction card body 18px'],
 ['caption grey #9c9090 on white','#9c9090','#ffffff','--caption-grey token'],
 ['atom grey #b4b4b4 on white','#b4b4b4','#ffffff','--atom-grey token'],
 ['score grey #8a8a8a on white','#8a8a8a','#ffffff','projectScene score 20px'],
 ['clock blue #0795ff on white','#0795ff','#ffffff','projectScene clock 32px'],
 ['clock red #fd2121 on white','#fd2121','#ffffff','projectScene clock <20s'],
 ['card title #000 on white','#000000','#ffffff','24px title'],
 ['white "C" on blue carbon','#ffffff','#0795ff','CarbonPill label'],
 ['white "C" on red carbon','#ffffff','#fd2121','CarbonPill label'],
 ['white "C" on green carbon','#ffffff','#69a13b','CarbonPill label'],
 ['white "H" on blue disc','#ffffff','#0795ff','HydrogenGlyph label'],
 ['white "H" on red disc','#ffffff','#fd2121','HydrogenGlyph label'],
 ['white "H" on green disc','#ffffff','#69a13b','HydrogenGlyph label'],
 ['card dashed border #5bb9ff on white','#5bb9ff','#ffffff','non-text UI, 3:1'],
 ['group box border #e6e6e6 on white','#e6e6e6','#ffffff','unchosen group'],
 ['chosen group border #0795ff on white','#0795ff','#ffffff','chosen group'],
 ['tray dashed #d4cdcd on white','#d4cdcd','#ffffff','selection tray'],
 ['tray solid #d8d8d8 on white','#d8d8d8','#ffffff','collected tray'],
 ['atom SVG ring #BEBABA on white','#bebaba','#ffffff','hydrogen disc outline'],
 ['heading stroke #a8a8a8 on white','#a8a8a8','#ffffff','outlinedHeading'],
 ['rail chip text #000 on white','#000000','#ffffff','22px'],
 ['focus ring #437fed on white','#437fed','#ffffff','focus-visible outline'],
];
for(const [n,a,b,note] of pairs) console.log(`${f(ratio(a,b)).padStart(6)}:1  ${n}   (${note})`);

console.log('\n--- COLOUR PAIR SEPARATION (atom vs atom) ---');
console.log(`red vs green luminance ratio: ${f(ratio('#fd2121','#69a13b'))}:1`);
console.log(`blue vs green luminance ratio: ${f(ratio('#0795ff','#69a13b'))}:1`);
console.log(`blue vs red  luminance ratio: ${f(ratio('#0795ff','#fd2121'))}:1`);

// Brettel/Vienot 1999 CVD simulation (linear RGB, LMS)
const toLMS=([r,g,b])=>[
 17.8824*r+43.5161*g+4.11935*b,
 3.45565*r+27.1554*g+3.86714*b,
 0.0299566*r+0.184309*g+1.46709*b];
const fromLMS=([l,m,s])=>[
 0.080944*l-0.130504*m+0.116721*s,
 -0.0102485*l+0.0540194*m-0.113615*s,
 -0.000365294*l-0.00412163*m+0.693513*s];
const M={
 protan:([l,m,s])=>[2.02344*m-2.5258*s,m,s],
 deutan:([l,m,s])=>[l,0.494207*l+1.24827*s,s],
 tritan:([l,m,s])=>[l,m,-0.395913*l+0.801109*m]};
const clamp=v=>Math.max(0,Math.min(1,v));
const unlin=c=>{c=clamp(c);return c<=0.0031308?c*12.92:1.055*Math.pow(c,1/2.4)-0.055;};
const toHex=rgb=>'#'+rgb.map(c=>Math.round(unlin(c)*255).toString(16).padStart(2,'0')).join('');
const sim=(h,t)=>toHex(fromLMS(M[t](toLMS(hex(h).map(lin)))));

console.log('\n--- SIMULATED ATOM COLOURS ---');
const atoms={blue:'#0795ff',red:'#fd2121',green:'#69a13b'};
for(const t of ['protan','deutan','tritan']){
  const out={};
  for(const [k,v] of Object.entries(atoms)) out[k]=sim(v,t);
  console.log(`${t}: blue=${out.blue} red=${out.red} green=${out.green}`);
  console.log(`   red~green ratio ${f(ratio(out.red,out.green))}:1 | blue~red ${f(ratio(out.blue,out.red))}:1 | blue~green ${f(ratio(out.blue,out.green))}:1`);
  // CIE76 deltaE in Lab
  const lab=h=>{const [r,g,b]=hex(h).map(lin);
    let X=(0.4124*r+0.3576*g+0.1805*b)/0.95047,Y=0.2126*r+0.7152*g+0.0722*b,Z=(0.0193*r+0.1192*g+0.9505*b)/1.08883;
    const fn=t=>t>0.008856?Math.cbrt(t):7.787*t+16/116;
    return [116*fn(Y)-16,500*(fn(X)-fn(Y)),200*(fn(Y)-fn(Z))];};
  const dE=(a,b)=>{const A=lab(a),B=lab(b);return Math.hypot(A[0]-B[0],A[1]-B[1],A[2]-B[2]);};
  console.log(`   deltaE76  red/green ${dE(out.red,out.green).toFixed(1)} | blue/red ${dE(out.blue,out.red).toFixed(1)} | blue/green ${dE(out.blue,out.green).toFixed(1)}`);
}
console.log('\n--- NORMAL VISION baseline deltaE ---');
{const lab=h=>{const [r,g,b]=hex(h).map(lin);
    let X=(0.4124*r+0.3576*g+0.1805*b)/0.95047,Y=0.2126*r+0.7152*g+0.0722*b,Z=(0.0193*r+0.1192*g+0.9505*b)/1.08883;
    const fn=t=>t>0.008856?Math.cbrt(t):7.787*t+16/116;
    return [116*fn(Y)-16,500*(fn(X)-fn(Y)),200*(fn(Y)-fn(Z))];};
 const dE=(a,b)=>{const A=lab(a),B=lab(b);return Math.hypot(A[0]-B[0],A[1]-B[1],A[2]-B[2]);};
 console.log(`red/green ${dE(atoms.red,atoms.green).toFixed(1)} | blue/red ${dE(atoms.blue,atoms.red).toFixed(1)} | blue/green ${dE(atoms.blue,atoms.green).toFixed(1)}`);}

console.log('\n--- TARGET SIZES at unit scales ---');
for(const u of [0.78,0.89,1.0]){
 console.log(`unit ${u}: hydrogen disc 47 -> ${(47*u).toFixed(1)}px | small carbon 54x50 -> ${(54*u).toFixed(1)}x${(50*u).toFixed(1)} | large carbon 88.56x82 -> ${(88.56*u).toFixed(1)}x${(82*u).toFixed(1)}`);
 console.log(`   gap between hydrogens 24 -> ${(24*u).toFixed(1)}px; carbon itemGap 9 -> ${(9*u).toFixed(1)}px`);
 console.log(`   fonts: 18->${(18*u).toFixed(1)} 20->${(20*u).toFixed(1)} 22->${(22*u).toFixed(1)} 24->${(24*u).toFixed(1)} 32->${(32*u).toFixed(1)}`);
}
