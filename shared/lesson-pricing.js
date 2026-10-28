export const LESSON_PRICES = {
 KG:{name:'KG term booklet',amount:5,enabled:true,description:'KG 1 and KG 2',weeks:12},
 PRIMARY_JHS:{name:'Primary / JHS booklet',amount:10,enabled:true,description:'Primary 1–6 and JHS 1–3',weeks:12},
 SHS:{name:'SHS semester booklet',amount:30,enabled:true,description:'SHS 1 through SHS 3 · Up to 16 weeks',weeks:16},
 CUSTOM:{name:'Custom scheme',amount:20,enabled:false,description:'Scheme upload and tailored generation · Coming soon'},
};
export function lessonProduct(classKey) {
 if(/^kg-[12]$/.test(classKey))return 'KG';
 if(/^basic-[1-9]$/.test(classKey))return 'PRIMARY_JHS';
 if(/^shs-[123]$/.test(classKey))return 'SHS';
 return null;
}
