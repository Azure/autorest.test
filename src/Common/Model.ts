/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Example } from "./Example"

export class Model
{
    public constructor (examples: Example[],
        config: any,
        namespace: string,
        cliCommandName: string,
        mgmtClientName: string,
        track2: boolean,
        methodsTotal: number,
        methodsCovered: number,
        examplesTotal: number,
        examplesTested: number)
    {
        this.examples = examples;
        this.config = config;
        this.namespace = namespace;
        this.cliCommandName = cliCommandName;
        this.mgmtClientName = mgmtClientName;
        this.track2 = track2;
        this.methodsTotal = methodsTotal;
        this.methodsCovered = methodsCovered;
        this.examplesTotal = examplesTotal;
        this.examplesTested = examplesTested;
    }

    public examples: Example[];
    public config: any;
    public namespace: string;
    public cliCommandName: string;
    public mgmtClientName: string;
    public track2: boolean;
    public methodsTotal: number;
    public methodsCovered: number;
    public examplesTotal: number;
    public examplesTested: number;
}
