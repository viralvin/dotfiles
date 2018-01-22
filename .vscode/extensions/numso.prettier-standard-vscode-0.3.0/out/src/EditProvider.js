"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const prettier = require('prettier');
const standard = require('standard');
function format(text) {
    return new Promise((resolve, reject) => {
        const config = vscode_1.workspace.getConfiguration('prettier');
        let parser = config.parser || 'babylon';
        let trailingComma = config.trailingComma || 'es5';
        const pretty = prettier.format(text, {
            printWidth: config.printWidth,
            tabWidth: config.tabWidth,
            singleQuote: config.singleQuote,
            trailingComma,
            bracketSpacing: config.bracketSpacing,
            jsxBracketSameLine: config.jsxBracketSameLine,
            parser,
            semi: false
        });
        standard.lintText(pretty, { fix: true, parser: 'babel-eslint' }, (err, result) => {
            if (err)
                return reportError('1', err);
            const output = result.results[0].output || pretty;
            if (typeof output === 'string')
                return resolve(output);
            if (result.results[0].errorCount)
                return reportError('2', result);
            return reportError('3', result);
        });
        function reportError(num, obj) {
            // console.log(num, JSON.stringify(obj, null, 2))
            standard.lintText(text, { fix: true, parser: 'babel-eslint' }, (err, result) => {
                if (err)
                    return reject(err);
                if (result.results[0].errorCount) {
                    // console.log(JSON.stringify(result, null, 2))
                    return reject({
                        message: result.results[0].messages[0].message,
                        loc: {
                            line: result.results[0].messages[0].line,
                            column: result.results[0].messages[0].column,
                        }
                    });
                }
                if (typeof result.results[0].output !== 'string') {
                    // console.log(JSON.stringify(result, null, 2))
                    return reject(new Error('Expected a string back from standard'));
                }
            });
        }
    });
}
function fullDocumentRange(document) {
    const lastLineId = document.lineCount - 1;
    return new vscode_1.Range(0, 0, lastLineId, document.lineAt(lastLineId).text.length);
}
class PrettierEditProvider {
    provideDocumentRangeFormattingEdits(document, range, options, token) {
        return format(document.getText(range))
            .then((newText) => [vscode_1.TextEdit.replace(range, newText)])
            .catch((e) => {
            let errorPosition;
            if (e.loc) {
                let charPos = e.loc.column;
                if (e.loc.line === 1)
                    charPos = range.start.character + e.loc.column;
                errorPosition = new vscode_1.Position(e.loc.line - 1 + range.start.line, charPos);
            }
            handleError(document, e.message, errorPosition);
        });
    }
    provideDocumentFormattingEdits(document, options, token) {
        return format(document.getText())
            .then((newText) => [vscode_1.TextEdit.replace(fullDocumentRange(document), newText)])
            .catch((e) => {
            let errorPosition;
            if (e.loc)
                errorPosition = new vscode_1.Position(e.loc.line - 1, e.loc.column);
            handleError(document, e.message, errorPosition);
        });
    }
}
exports.default = PrettierEditProvider;
function handleError(document, message, errorPosition) {
    if (!errorPosition)
        return vscode_1.window.showErrorMessage(message);
    vscode_1.window.showErrorMessage(message, 'Show').then(function onAction(action) {
        if (action === 'Show') {
            const rangeError = new vscode_1.Range(errorPosition, errorPosition);
            vscode_1.window.showTextDocument(document).then((editor) => {
                editor.selection = new vscode_1.Selection(rangeError.start, rangeError.end);
                editor.revealRange(rangeError);
            });
        }
    });
}
//# sourceMappingURL=EditProvider.js.map