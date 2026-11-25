import { mkdirSync, writeFileSync } from 'node:fs';
// 32px BGRA Windows 图标：灰绿底色上的简洁钟面。
const n=32, pixels=Buffer.alloc(n*n*4), mask=Buffer.alloc(n*4);
for(let y=0;y<n;y++)for(let x=0;x<n;x++){
 const p=((n-1-y)*n+x)*4;
 const ring=Math.abs(Math.hypot(x-15.5,y-15.5)-10)<1;
 const hand=(Math.abs(x-15.5)<1&&y>=8&&y<=16)||(Math.abs(y-15.5)<1&&x>=15&&x<=22);
 const rgb=ring||hand?[255,254,250]:[83,107,91];
 pixels[p]=rgb[2];pixels[p+1]=rgb[1];pixels[p+2]=rgb[0];pixels[p+3]=255;
}
const header=Buffer.alloc(22);header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);header[6]=n;header[7]=n;header.writeUInt16LE(1,10);header.writeUInt16LE(32,12);header.writeUInt32LE(40+pixels.length+mask.length,14);header.writeUInt32LE(22,18);
const dib=Buffer.alloc(40);dib.writeUInt32LE(40);dib.writeInt32LE(n,4);dib.writeInt32LE(n*2,8);dib.writeUInt16LE(1,12);dib.writeUInt16LE(32,14);dib.writeUInt32LE(pixels.length,20);
mkdirSync('src-tauri/icons',{recursive:true});writeFileSync('src-tauri/icons/icon.ico',Buffer.concat([header,dib,pixels,mask]));
