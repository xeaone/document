// import { doc } from "https://deno.land/x/deno_doc/mod.ts";
// const result = await doc("https://deno.land/x/xdatabase/mod.ts");
// for (const node of result) {
//     console.log(node);
// }

import { ts } from 'https://deno.land/x/ts_morph/mod.ts';

const isNodeExported = function (node: ts.Node): boolean {
    return (
        (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0 ||
        (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
    );
};

const leadingComment = function (sourceFile: ts.SourceFile, n: ts.Node) {
    const [ commentRange ] = ts.getLeadingCommentRanges(sourceFile.getFullText(), n.getFullStart()) ?? [];
    const commentText = commentRange ? sourceFile.getFullText().slice(commentRange.pos, commentRange.end) : '';
    return commentText.startsWith('/**') ? `${commentText.slice(3, -2).replace(/^\s*\*\s*/gm, '')}` : '';
};

const parameters = function (sourceFile: ts.SourceFile, node: ts.MethodDeclaration | ts.ConstructorDeclaration) {
    return node.parameters?.map(p => `${p.name.getText(sourceFile)}: ${p.type?.getText(sourceFile)}`).join(',') ?? '';
};

const typeParameters = function (sourceFile: ts.SourceFile, node: ts.MethodDeclaration | ts.ConstructorDeclaration) {
    return node.typeParameters?.map(p => `${p.name.getText(sourceFile)}: ${p.constraint?.getText(sourceFile)}`).join(',') ?? '';
};

export default function (code: string) {
    const lines: string[] = [];
    const sourceFile = ts.createSourceFile('./mod.ts', code, ts.ScriptTarget.ESNext);

    const sourceChildren = sourceFile.statements;
    for (const sourceChild of sourceChildren) {
        console.log(sourceChild.kind, ts.SyntaxKind[ sourceChild.kind ]);
        if (sourceChild.kind === ts.SyntaxKind.ClassDeclaration && isNodeExported(sourceChild)) {
            const classNode: ts.ClassDeclaration = <ts.ClassDeclaration>sourceChild;

            let line = '';
            const className = classNode.name?.getText(sourceFile);
            const classComment = leadingComment(sourceFile, classNode);
            const classHeritage = classNode.heritageClauses?.map(h => h.getText(sourceFile)).join('');

            line += `\n## ${className}`;
            line += ` ${classHeritage}`;

            if (classComment.startsWith('/**')) {
                line += `\n${classComment.slice(3, -2).replace(/^\s*\*\s*/gm, '')}`;
            }

            lines.push(line);

            const classChildren = classNode.members;
            for (const classChild of classChildren) {
                console.log(classChild.kind, ts.SyntaxKind[ classChild.kind ]);
                if (classChild.kind === ts.SyntaxKind.PropertyDeclaration) {
                    const propertyNode = <ts.PropertyDeclaration>classChild;
                    if (ts.isPrivateIdentifier(propertyNode.name)) continue;

                    let line = '';
                    const propertyName = propertyNode.name.getText(sourceFile);
                    const propertyType = propertyNode.type?.getText(sourceFile);
                    const propertyComment = leadingComment(sourceFile, propertyNode);
                    const propertyInitializer = propertyNode.initializer?.getText(sourceFile);
                    const propertyModifier = propertyNode.modifiers?.[ 0 ].getText(sourceFile) ?? '';

                    line += `\n### `;

                    if (propertyModifier) line += `${propertyModifier} `;

                    if (propertyType) {
                        line += `${className}.${propertyName}: ${propertyType}`;
                    } else {
                        line += `${className}.${propertyName} = ${propertyInitializer}`;
                    }

                    if (propertyComment) line += `\n${propertyComment}`;

                    lines.push(line);
                } else if (classChild.kind === ts.SyntaxKind.Constructor) {
                    const constructorNode = <ts.ConstructorDeclaration>classChild;

                    let line = '';
                    const constructorName = 'constructor';
                    const constructorComment = leadingComment(sourceFile, constructorNode);
                    const constructorReturnType = constructorNode.type?.getText(sourceFile);
                    const constructorModifier = constructorNode.modifiers?.[ 0 ].getText(sourceFile) ?? '';
                    const constructorParameters = parameters(sourceFile, constructorNode);
                    const constructorTypeParameters = typeParameters(sourceFile, constructorNode);

                    line += `\n### `;
                    if (constructorModifier) line += `${constructorModifier} `;
                    line += `${className}.${constructorName}`;
                    if (constructorTypeParameters) line += `<${constructorTypeParameters}> `;
                    line += `(`;
                    if (constructorParameters) line += `${constructorParameters}`;
                    line += `)`;
                    if (constructorReturnType) line += `: ${constructorReturnType}`;

                    if (constructorComment) line += `\n${constructorComment}`;

                    lines.splice(1, 0, line);
                } else if (classChild.kind === ts.SyntaxKind.MethodDeclaration) {
                    const methodNode = <ts.MethodDeclaration>classChild;

                    if (ts.isPrivateIdentifier(methodNode.name)) continue;

                    let line = '';
                    const methodName = methodNode.name.getText(sourceFile);
                    const methodComment = leadingComment(sourceFile, methodNode);
                    const methodReturnType = methodNode.type?.getText(sourceFile);
                    const methodModifier = methodNode.modifiers?.[ 0 ].getText(sourceFile) ?? '';
                    const methodParameters = parameters(sourceFile, methodNode);
                    const methodTypeParameters = typeParameters(sourceFile, methodNode);
                    // console.log(comment);
                    // console.log(methodNode);
                    // console.log(methodNode.name.getText(sourceFile));
                    // console.log(methodNode.type?.getText(sourceFile));
                    // console.log(methodNode.body?.getText(sourceFile));
                    // console.log(result);

                    line += `\n### `;
                    if (methodModifier) line += `${methodModifier} `;
                    line += `${className}.${methodName}`;
                    if (methodTypeParameters) line += `<${methodTypeParameters}> `;
                    line += `(`;
                    if (methodParameters) line += `${methodParameters}`;
                    line += `)`;
                    if (methodReturnType) line += `: ${methodReturnType}`;

                    if (methodComment) line += `\n${methodComment}`;

                    lines.push(line);
                }
            }

        }
    }

    return lines.join('\n');
}

