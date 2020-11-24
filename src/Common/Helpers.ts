/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { sep } from "path";
import { isFunction } from "util";

export function ToSnakeCase(v: string)
{
    let snake: string = v.replace(/([a-z](?=[A-Z]))/g, '$1 ').split(' ').join('_').toLowerCase();

    // handle some exceptions that are not translated correctly
    snake = snake.replace("ipaddress", "ip_address");
    snake = snake.replace("ipconfiguration", "ip_configuration");
    snake = snake.replace("ipprefixes", "ip_prefixes");
    snake = snake.replace("wanname", "wan_name");
    snake = snake.replace("wanparameters", "wan_parameters");
    snake = snake.replace("v2parameters", "v2_parameters");
    
    return snake;
}

export function Capitalize(v: string) {
    return v.charAt(0).toUpperCase() + v.slice(1);
}

export function Uncapitalize(v: string) {
    return v.charAt(0).toLowerCase() + v.slice(1);
}

export function ToCamelCase(v: string)
{
    v = v.toLowerCase().replace(/[^A-Za-z0-9]/g, ' ').split(' ')
    .reduce((result, word) => result + Capitalize(word.toLowerCase()));
    return v.charAt(0).toLowerCase() + v.slice(1);
}

export function ToGoCase(v: string)
{
    if (v === '') return v;
    return ensureNameCase(removeInvalidCharacters(pascalCase(v)));
}

function ensureNameCase(name: string): string {
    const words = toWords(name);
    let r = '';
    for (let i = 0; i < words.length; i++) {
        let word = words[i];
        if (commonInitialisms.has(word)) {
            word = word.toUpperCase();
        } else if (i < words.length - 1) {
            const concat = words[i] + words[i + 1].toLowerCase();
            if (commonInitialisms.has(concat)) {
                word = concat.toUpperCase();
                i++;
            }
        }
        r += word;
    }
    return r;
}

function toWords(value: string) : string[] {
    return wordMapCache[value] === undefined
        ? wordMapCache[value] = value.replace(/([A-Z][a-z]+)/g, ' $1 ').split(' ').filter(v => v !== '')
        : wordMapCache[value];
}

const wordMapCache: {[key: string]: string[]} = {};

function pascalCase(name: string): string {
    if (name === '') return name;
    return name.split(/[\._@\- $]+/)
        .filter((v, i, a) => v !== "")
        .map((s, i, a) => s[0].toUpperCase() + s.substring(1))
        .reduce((r, w) => r + w);
}

function removeInvalidCharacters(name: string): string {
    return getValidName(name, ['_', '-']);
}

function getValidName(name:string, allowedCharacters: string[]): string {
    var correctName = ensureValidCharacters(name, allowedCharacters);
    if (correctName === '' || basicLaticCharacters[correctName[0]]) {
        correctName = ensureValidCharacters(
            name.split('').map((s, i, a) => basicLaticCharacters[s] ? basicLaticCharacters[s] : s).reduce((r, w) => r + w), 
            allowedCharacters);
    }

    if (correctName === '') {
        throw `Property name {name} cannot be used as an Identifier, as it contains only invalid characters.`;
    }
    return correctName;
}

function ensureValidCharacters(name: string, allowedCharacters: string[]): string {
    return name.replace('[]', 'Sequence').split('')
        .filter((c, i, a) => c.match(/^[A-Za-z0-9]$/) || allowedCharacters.includes(c))
        .join('');
}

const basicLaticCharacters = {
    ' ': 'Space',
    '!': 'ExclamationMark',
    '"': "QuotationMark",
    '#': "NumberSign",
    '$': "DollarSign",
    '%': "PercentSign",
    '&': "Ampersand",
    '\'': "Apostrophe",
    '(': "LeftParenthesis",
    ')': "RightParenthesis",
    '*': "Asterisk",
    '+': "PlusSign",
    ',': "Comma",
    '-': "HyphenMinus",
    '.': "FullStop",
    '/': "Slash",
    '0': "Zero",
    '1': "One",
    '2': "Two",
    '3': "Three",
    '4': "Four",
    '5': "Five",
    '6': "Six",
    '7': "Seven",
    '8': "Eight",
    '9': "Nine",
    ':': "Colon",
    ';': "Semicolon",
    '<': "LessThanSign",
    '=': "EqualSign",
    '>': "GreaterThanSign",
    '?': "QuestionMark",
    '@': "AtSign",
    '[': "LeftSquareBracket",
    '\\': "Backslash",
    ']': "RightSquareBracket",
    '^': "CircumflexAccent",
    '`': "GraveAccent",
    '{': "LeftCurlyBracket",
    '|': "VerticalBar",
    '}': "RightCurlyBracket",
    '~': "Tilde"
};

const commonInitialisms = new Set([
    "Acl",
    "Api",
    "Ascii",
    "Cpu",
    "Css",
    "Dns",
    "Eof",
    "Guid",
    "Html",
    "Http",
    "Https",
    "Id",
    "Ip",
    "Json",
    "Lhs",
    "Qps",
    "Ram",
    "Rhs",
    "Rpc",
    "Sla",
    "Smtp",
    "Sql",
    "Ssh",
    "Tcp",
    "Tls",
    "Ttl",
    "Udp",
    "Ui",
    "Uid",
    "Uuid",
    "Uri",
    "Url",
    "Utf8",
    "Vm",
    "Xml",
    "Xsrf",
    "Xss",
]);



export function Indent(original: string): string
{
    return " ".repeat(original.length);
}

export function EscapeString(original: string): string
{
    if (original == undefined) return "undefined";
    original = original.split('\n').join(" ");
    original = original.split('\'').join("\\\'");
    return original;
}

//
// Special names are these that don't follow myXxxXxx convention
// and shouldn't be replaced
//
export function IsSpecialName(name: string): boolean {
    return [ "AzurePrivatePeering",
             "GatewaySubnet"
           ].indexOf(name) >=0;
}

export function isDict(v) {
    return typeof v === 'object' && v !== null && !(v instanceof Array) && !(v instanceof Date);
}

let abbreMem: object = {};
export function abbre(_in: string, seperator="_"): string {
    return uniqueName(_in, (x)=> {
        return _in.split(".").map(x=> {
            let ret = "";
            for (let word of x.split("_")) {
                if (word.length>0)  ret += word[0];
            }
            return ret;
        }).join(seperator);
    });
}

export function uniqueName(_in: string, fnMapName: (x) => string = (x) => x) {
    let i=0;
    while(true) {
        let ret = fnMapName(_in);

        if (i>0)    ret+=i.toString();

        if (!abbreMem.hasOwnProperty(ret) || abbreMem[ret]==_in) {
            abbreMem[ret] = _in;
            return ret;
        }
        i += 1;
    }
}

function isEscaped(str: string, index: number): boolean {
    let slashNum = 0;
    index--;
    while (index >= 0 && str[index] == '\\') {
        slashNum += 1;
        index--;
    }
    return slashNum % 2 == 1;
}

export function ToMultiLine(sentence: string, output: string[] = undefined, maxLength: number = 119, strMode: boolean = false): string[] {
    let lastComma = -1;
    let inStr = false;
    let strTag = "";
    let ret = [""];
    let spaceNum = 0;
    let strStart = -1;
    let inStrTags = Array(maxLength).fill(strMode);
    let isStrTags = Array(maxLength).fill(false);
    let indents = [];
    while (spaceNum < sentence.length && sentence[spaceNum] == ' ') spaceNum++;
    let indent = spaceNum;

    if (strMode) {
        inStr = true;
        strTag = 'impossible';
    }
    if (maxLength < 3) maxLength = 3;
    let hardReturn = false;
    for (let i = 0; i < sentence.length; i++) {
        if (sentence[i] == ' ' && !inStr && ret.length > 1 && ret[ret.length - 1].length == (indent > 0 ? indent : spaceNum)) continue;
        ret[ret.length - 1] += sentence[i];
        isStrTags[ret[ret.length - 1].length-1] = false;
        let oldHardReturn = hardReturn;
        hardReturn = false;
        if (inStr) {
            if (sentence[i] == strTag && !isEscaped(sentence, i)) {
                inStr = false;
                isStrTags[ret[ret.length - 1].length-1] = true;
            }
            inStrTags[ret[ret.length - 1].length-1] = true;
        }
        else {
            if (sentence[i] == ',') {
                lastComma = ret[ret.length - 1].length - 1;
                if (indents.length>0) {
                    hardReturn = true;
                }
            }
            if (sentence[i] == '\'' && !isEscaped(sentence, i)) {
                inStr = true;
                strTag = '\'';
                strStart = i;
                isStrTags[ret[ret.length - 1].length-1] = true;
            }
            else if (sentence[i] == '\"' && !isEscaped(sentence, i)) {
                inStr = true;
                strTag = '\"';
                strStart = i;
                isStrTags[ret[ret.length - 1].length-1] = true;
            }

            if (sentence[i] == '(' || sentence[i] == '[') {
                indents.push(indent);
                hardReturn = true;
                // indent = ret[ret.length - 1].length;
                indent += 4;
            }
            if (sentence[i] == ')' || sentence[i] == ']') {
                indent = indents.pop();
                oldHardReturn = true;
            }
            inStrTags[ret[ret.length - 1].length-1] = inStr;
        }
        
        if (ret[ret.length - 1].length >= maxLength || oldHardReturn) {
            if (inStr) {
                let lastNormal = ret[ret.length - 1].length - 1;
                let originLastNormal = lastNormal;
                while (lastNormal >= 0 && isEscaped(ret[ret.length - 1], lastNormal + 1)) lastNormal--;
                let UnEscapedLastNormal = lastNormal;
                for (let n = 0; n < Math.min(30, maxLength - 1); n++) {
                    if (i - n == strStart) break;
                    if (ret[ret.length - 1][lastNormal] != ' ') {
                        lastNormal--;
                    }
                    else {
                        break;
                    }
                }
                if (ret[ret.length - 1][lastNormal] != ' ' && i - (originLastNormal - lastNormal) != strStart) {
                    lastNormal = UnEscapedLastNormal;
                }

                if (strMode) {
                    if (lastNormal != ret[ret.length - 1].length - 1) {
                        let newLine = ret[ret.length - 1].substr(lastNormal + 1);
                        ret[ret.length - 1] = ret[ret.length - 1].substr(0, lastNormal + 1) + "\\";
                        ret.push(newLine);
                        lastComma = -1;
                    }
                    else {
                        if (i < sentence.length - 1) {
                            ret[ret.length - 1] += "\\";
                            ret.push('');
                            lastComma = -1;
                        }
                    }
                }
                else {
                    let CommaPos = lastComma;
                    if (lastNormal != ret[ret.length - 1].length - 1) {
                        let newLine = ' '.repeat(indent > 0 ? indent : spaceNum) + strTag + ret[ret.length - 1].substr(lastNormal + 1);
                        ret[ret.length - 1] = ret[ret.length - 1].substr(0, lastNormal + 1) + strTag;
                        ret.push(newLine);
                        lastComma = -1;
                    }
                    else {
                        ret[ret.length - 1] += strTag;
                        ret.push(' '.repeat(indent > 0 ? indent : spaceNum) + strTag);
                        lastComma = -1;
                    }

                    if (ret[ret.length-2].length>=2) {
                        let lenLast = ret[ret.length - 2].length;
                        // if (lenLast >= 4 && ret[ret.length - 2][lenLast - 2] == ' ' && ret[ret.length - 2][lenLast - 3] == strTag && (ret[ret.length - 2][lenLast - 4] != "\\")) {   // remove empty string in the end of line
                        //     ret[ret.length - 1] = ret[ret.length - 1].substr(0, lenLast - 2);
                        // }
                        if (isStrTags[lenLast-2]) {
                            if (ret[ret.length-2].slice(0, -2).match(/^ *$/i))
                                ret.splice(ret.length-2, 1);
                            else
                            {
                                ret[ret.length-2] = ret[ret.length-2].slice(0, -2); // remove "" at the tail
                                if (ret[ret.length-2].slice(-1)[0]!="=") {
                                    while (ret[ret.length-2].slice(-1)[0] == " ") {     // remove all spaces before ""
                                        ret[ret.length-2] = ret[ret.length-2].slice(0, -1); 
                                    }
                                }
                                else {
                                    // there is = in the end of line --> create new line from the last comma
                                    let tmp = ret[ret.length-2].slice(CommaPos+1).trimLeft();
                                    if (CommaPos<0) {
                                        ret.splice(ret.length-2, 1);
                                    }
                                    else {
                                        ret[ret.length-2] = ret[ret.length-2].slice(0, CommaPos+1);
                                    }
                                    let startSpaceNum = ret[ret.length-1].search(/\S|$/);
                                    if (startSpaceNum>=0) {
                                        ret[ret.length-1] = ' '.repeat(startSpaceNum) + tmp + ret[ret.length-1].substr(startSpaceNum);
                                    }
                                    else {
                                        ret[ret.length-1] = tmp + ret[ret.length-1];
                                    }
                                }
                            }
                            
                        }
                    }
                }
            }
            else {
                if (lastComma >= 0) {
                    //find indent by parathesis before the lastComma
                    let close_para = 0;
                    for (let i = lastComma; i > indent; i--) {
                        if (inStrTags[i]) continue;
                        let currentChar = ret[ret.length - 1][i];
                        if (currentChar == ')' || currentChar == ']') close_para++;
                        if (currentChar == '(' || currentChar == '[') {
                            if (close_para == 0) {
                                indents.push(indent);
                                indent = i + 1;
                                break;
                            }
                            else {
                                close_para--;
                            }
                        }
                    }

                    let prefixSpaces = ret[ret.length - 1].search(/\S|$/);
                    if (indent > 0) prefixSpaces = indent;
                    let newLine = ' '.repeat(prefixSpaces) + ret[ret.length - 1].substr(lastComma + 1).trimLeft();
                    ret[ret.length - 1] = ret[ret.length - 1].substr(0, lastComma + 1);
                    ret.push(newLine);
                    lastComma = -1;
                }
                else if (oldHardReturn) {
                    let prefixSpaces = ret[ret.length - 1].search(/\S|$/);
                    if (indent > 0) prefixSpaces = indent;
                    let returnPos = ret[ret.length - 1].length-1;
                    let newLine = ' '.repeat(prefixSpaces) + ret[ret.length - 1].substr(returnPos).trimLeft();
                    ret[ret.length - 1] = ret[ret.length - 1].substr(0, returnPos);
                    ret.push(newLine);
                    lastComma = -1;
                }
                else if (i < sentence.length - 2) {
                    for (let j=ret[ret.length - 1].length-1; j>indent; j--) {
                        let currentChar = ret[ret.length - 1][j];
                        if (!currentChar.match(/[a-z0-9_]/i) && sentence[i+1] != ",") {
                            let prefixSpaces = ret[ret.length - 1].search(/\S|$/);
                            if (indent > 0) prefixSpaces = indent;
                            let newLine = ' '.repeat(prefixSpaces) + ret[ret.length - 1].substr(j + 1).trimLeft();
                            ret[ret.length - 1] = ret[ret.length - 1].substr(0, j + 1);
                            if (indents.length==0) {
                                ret[ret.length - 1] += "\\";    // fix E502
                            }
                            ret.push(newLine);
                            lastComma = -1;
                            break;
                        }
                    }
                }
            }

            let firstCharIdx = 0;
            let newLine = ret[ret.length - 1];
            while (firstCharIdx < ret[0].length && ret[0][firstCharIdx] == ' ' && firstCharIdx < newLine.length && newLine[firstCharIdx] == ' ') firstCharIdx++;
            if (firstCharIdx < newLine.length && firstCharIdx < ret[0].length && ret[0][firstCharIdx] == '#') {
                ret[ret.length - 1] = `${newLine.substr(0, firstCharIdx)}# ${newLine.substr(firstCharIdx)}`;
            }
        }
    }
    if (!inStr && ret[ret.length - 1].trim().length == 0) ret.pop();
    if (output != undefined) {
        for (let line of ret) output.push(line);
    }
    return ret;
}
