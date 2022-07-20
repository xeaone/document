import Document from './mod.ts';

const AClass = `
/**
 * AClass markdown comment.
*/
export class AClass extends Map, Set {

    instancePropertyThing = 'thing';
    instancePropertyNumberType: number;

    static staticMethod(){}
    static staticPropertyThing = 'thing';
    static staticPropertyNumberType: number;

    /**
     * Constructor markdown comment.
     *
    */
    constructor(param:any){}

    /**
     * Instance method markdown comment.
    */
    async instanceMethod <p extends string> (param: string) : string {
        return 'hello world';
    }

}
`;

const BClass = `
/**
 * BClass markdown comment.
*/
export class BClass extends Map, Set {

    instancePropertyThing = 'thing';
    instancePropertyNumberType: number;

    static staticMethod(){}
    static staticPropertyThing = 'thing';
    static staticPropertyNumberType: number;

    /**
     * Constructor markdown comment.
    */
    constructor(param:any){}

    /**
     * Instance method markdown comment.
    */
    async instanceMethod <p extends string> (param: string) : string {
        return 'hello world';
    }

}
`;

const AClassBClassDefault = `
export type St = 'st';
export type Ar = Array;
export type ArrayOrObjectType = Array | Object;
export type SimpleType = {
  a: string;
  b?: number;
};
export interface MyInterface {
  a: string;
  b?: number;
}
export { AClass, BClass }
`;

const code =
    AClass
    +
    BClass
    +
    AClassBClassDefault;

// const code = await fetch('https://raw.githubusercontent.com/xeaone/database/main/mod.ts').then(r => r.text());

const document = Document(code);

Deno.writeTextFileSync('./test.md', document);

