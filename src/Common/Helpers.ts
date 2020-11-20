/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

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
