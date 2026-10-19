import { render, books } from './template.js';
const A={name_th:'ต้น',romanisation:'Ton',youth:false,age:30,gender:'male',role:'Barista at a café',appearance:'~178 cm, chest/waist/hip ≈ 100/84/96 cm, lean build',personality:'Not yet specified.',speech:'Self "ผม", particle ครับ',examples:['รับอะไรดีครับ'],relationships:'Not yet specified.',secrets:'',notes:''};
const Y={name_th:'ฝน',romanisation:'Fon',youth:true,grade:'ม.2',age:13,gender:'female',role:'Student, lives next door',appearance:'~152 cm, slim, bust 80, ponytail, school uniform',personality:'Shy',speech:'Self "หนู", ค่ะ',examples:['สวัสดีค่ะ','หนูมีแฟนแล้วนะ'],relationships:'Has a boyfriend',secrets:'secret crush',notes:'Reply in natural Thai.'};
const U={name_th:'ปอ',romanisation:'Por',youth:false,age:19,gender:'unknown',role:'University student',appearance:'~170 cm',personality:'',speech:'',examples:[],relationships:'',secrets:'',notes:''};
for (const [n,j,inp,m] of [['ต้น — Auto x',A,'อายุ 30 ผู้ชาย เป็นบาริสต้า',false],['ฝน',Y,'นักเรียน ม.2 อายุ 13',null],['ปอ',U,'อายุ 19 นักศึกษามหาลัย',null],['แก้ว',{...A,gender:'female',age:null},'แม่ค้าตลาด',null]]) {
  const r=render(n,j,inp,m); console.log('=== youth',r.youth,'flagged',r.flagged,'books',books(r.youth).length); console.log(r.text);
}
