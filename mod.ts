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
    return commentText.startsWith('/**') ? `${commentText.slice(4, -3).replace(/^\s*[*]\s*/gm, '')}` : '';
};

const parameters = function (sourceFile: ts.SourceFile, node: ts.MethodDeclaration | ts.ConstructorDeclaration) {
    return node.parameters?.map(p => `${p.name.getText(sourceFile)}: ${p.type?.getText(sourceFile)}`).join(', ') ?? '';
};

const typeParameters = function (sourceFile: ts.SourceFile, node: ts.MethodDeclaration | ts.ConstructorDeclaration) {
    return node.typeParameters?.map(p => `${p.name.getText(sourceFile)}: ${p.constraint?.getText(sourceFile)}`).join(', ') ?? '';
};

const modifiers = function (sourceFile: ts.SourceFile, node: ts.MethodDeclaration | ts.ConstructorDeclaration | ts.PropertyDeclaration) {
    return node.modifiers?.map(m => m.getText(sourceFile)).join(' ') ?? '';
    // return node.modifiers?.map(m => m.getText(sourceFile)) ?? [];
};

export default function (code: string) {
    const lines: string[] = [];
    const sourceFile = ts.createSourceFile('./mod.ts', code, ts.ScriptTarget.ESNext, false);

    const sourceChildren = sourceFile.statements;
    for (const sourceChild of sourceChildren) {
        if (!isNodeExported(sourceChild)) continue;
        // console.log(sourceChild.kind, ts.SyntaxKind[ sourceChild.kind ]);

        if (ts.isInterfaceDeclaration(sourceChild)) {
            const interfaceNode = <ts.InterfaceDeclaration>sourceChild;
            const interfaceName = interfaceNode.name?.getText(sourceFile);
            const interfaceComment = leadingComment(sourceFile, interfaceNode);

            let interfaceLine = `\n\n# ${interfaceName} \`interface\``;
            if (interfaceComment) interfaceLine += `\n${interfaceComment}`;
            interfaceLine += '\n## Properties';

            for (const interfaceChild of interfaceNode.members) {
                interfaceLine += `\n### \`${interfaceName}.${interfaceChild.getText(sourceFile)} \``;
                const interfaceComment = leadingComment(sourceFile, interfaceChild);
                if (interfaceComment) interfaceLine += `\n${interfaceComment}`;
            }

            lines.push(interfaceLine);
        } else if (ts.isTypeAliasDeclaration(sourceChild)) {

            const typeNode = <ts.TypeAliasDeclaration>sourceChild;
            const typeName = typeNode.name?.getText(sourceFile);
            const typeComment = leadingComment(sourceFile, typeNode);
            const typeChildren = typeNode.getChildren(sourceFile);

            let typeLine = `\n\n# ${typeName} \`type\``;
            if (typeComment) typeLine += `\n${typeComment}`;

            for (const typeChild of typeChildren) {
                if (ts.isTypeLiteralNode(typeChild)) {
                    typeLine += '\n## Properties';
                    const typeLiteralNode = <ts.TypeLiteralNode>typeChild;
                    for (const memberNode of typeLiteralNode?.members) {
                        typeLine += `\n### \`${typeName}.${memberNode.getText(sourceFile)} \``;
                        const memberComment = leadingComment(sourceFile, memberNode);
                        if (memberComment) typeLine += `\n${memberComment}`;
                    }
                } else if ([
                    ts.SyntaxKind.UnionType,
                    ts.SyntaxKind.LiteralType,
                    ts.SyntaxKind.TypeReference
                ].includes(typeChild.kind)) {
                    typeLine += '\n## Value';
                    typeLine += `\n### \`${typeChild.getText(sourceFile)} \``;
                    const typeChildComment = leadingComment(sourceFile, typeChild);
                    if (typeChildComment) typeLine += `\n${typeChildComment}`;
                }
            }

            lines.push(typeLine);
        } else if (ts.isClassDeclaration(sourceChild)) {
            const staticPropertyLines = [];
            const staticMethodLines = [];
            const instancePropertyLines = [];
            const instanceMethodLines = [];

            const classNode = <ts.ClassDeclaration>sourceChild;
            const classChildren = classNode.members;
            const className = classNode.name?.getText(sourceFile);
            const classComment = leadingComment(sourceFile, classNode);
            // const classHeritage = classNode.heritageClauses?.map(h => h.getText(sourceFile)).join('');

            let classLine = `\n\n# ${className} \`class\``;
            if (classComment) classLine += `\n${classComment}`;
            classLine += `\n## Constructor`;
            lines.push(classLine);

            for (const classChild of classChildren) {
                if (ts.isPropertyDeclaration(classChild)) {
                    if (ts.isPrivateIdentifier((classChild as ts.PropertyDeclaration).name)) continue;

                    const propertyNode = <ts.PropertyDeclaration>classChild;
                    const propertyName = propertyNode.name.getText(sourceFile);
                    const propertyType = propertyNode.type?.getText(sourceFile);
                    const propertyComment = leadingComment(sourceFile, propertyNode);
                    const propertyInitializer = propertyNode.initializer?.getText(sourceFile);
                    const propertyModifiers = modifiers(sourceFile, propertyNode);

                    let propertyLine = '\n### `';
                    propertyLine += `${className}.${propertyName}`;
                    if (propertyType) propertyLine += `: ${propertyType}`;
                    else propertyLine += ` = ${propertyInitializer}`;
                    propertyLine += '`';
                    if (propertyComment) propertyLine += `\n${propertyComment}`;

                    if (propertyModifiers.includes('static')) staticPropertyLines.push(propertyLine);
                    else instancePropertyLines.push(propertyLine);

                } else if (ts.isConstructorDeclaration(classChild)) {

                    const constructorNode = <ts.ConstructorDeclaration>classChild;
                    const constructorComment = leadingComment(sourceFile, constructorNode);
                    const constructorReturnType = constructorNode.type?.getText(sourceFile);
                    const constructorParameters = parameters(sourceFile, constructorNode);
                    const constructorTypeParameters = typeParameters(sourceFile, constructorNode);

                    let constructorLine = '\n### `';
                    constructorLine += `${className}`;
                    if (constructorTypeParameters) constructorLine += `<${constructorTypeParameters}> `;
                    constructorLine += `(`;
                    if (constructorParameters) constructorLine += `${constructorParameters}`;
                    constructorLine += `)`;
                    if (constructorReturnType) constructorLine += `: ${constructorReturnType}`;
                    constructorLine += '`';
                    if (constructorComment) constructorLine += `\n${constructorComment}`;

                    lines.push(constructorLine);

                } else if (ts.isMethodDeclaration(classChild)) {
                    if (ts.isPrivateIdentifier((classChild as ts.MethodDeclaration).name)) continue;

                    const methodNode = <ts.MethodDeclaration>classChild;
                    const methodName = methodNode.name.getText(sourceFile);
                    const methodModifiers = modifiers(sourceFile, methodNode);
                    const methodParameters = parameters(sourceFile, methodNode);
                    const methodComment = leadingComment(sourceFile, methodNode);
                    const methodReturnType = methodNode.type?.getText(sourceFile);
                    const methodTypeParameters = typeParameters(sourceFile, methodNode);
                    // console.log(comment);
                    // console.log(methodNode);
                    // console.log(methodNode.name.getText(sourceFile));
                    // console.log(methodNode.type?.getText(sourceFile));
                    // console.log(methodNode.body?.getText(sourceFile));
                    // console.log(result);

                    let methodLine = '\n### `';
                    methodLine += `${className}.${methodName}`;
                    if (methodTypeParameters) methodLine += `<${methodTypeParameters}> `;
                    methodLine += `(`;
                    if (methodParameters) methodLine += `${methodParameters}`;
                    methodLine += `)`;
                    if (methodReturnType) methodLine += `: ${methodReturnType}`;
                    methodLine += '`';
                    if (methodComment) methodLine += `\n${methodComment}`;

                    if (methodModifiers.includes('static')) staticMethodLines.push(methodLine);
                    else instanceMethodLines.push(methodLine);

                }
            }

            if (staticPropertyLines.length) lines.push('\n## Static Properties', ...staticPropertyLines);
            if (staticMethodLines.length) lines.push('\n## Static Methods', ...staticMethodLines);
            if (instancePropertyLines.length) lines.push('\n## Instance Properties', ...instancePropertyLines);
            if (instanceMethodLines.length) lines.push('\n## Instance Methods', ...instanceMethodLines);

        }
    }

    return lines.join('\n');
}

