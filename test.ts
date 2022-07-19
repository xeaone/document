import Document from './mod.ts';

const code = `
export class MyClass extends Map, Set {

    num:number;
    thing = 'things';

    static method(){}

    constructor(str:string){}

    /**
    * *test
    * #### r
    */
    async byId<p extends string> (param: string): string {
        return 'hello';
    }

}
`;


const document = Document(code);

console.log(document);
