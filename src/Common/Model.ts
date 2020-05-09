/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Example, ExampleVariable } from "./Example"

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

    public needCompute() : boolean {
        return false;
    }

    public needNetwork() : boolean {
        return false;
    }

    public needStorage() : boolean {
        return false;
    }

    public needKeyvault() : boolean {
        return false;
    }

    public needNetworkInterface() : boolean {
        return false;
    }

    public needVirtualNetwork() : boolean {
        return false;
    }

    public needSubnet() : boolean {
        return false;
    }

    public needVirtualMachine() : boolean {
        return false;
    }

    public getVars(): any[] {
        if (this._vars == null) {
            this.AggregateVars();
        }
        return this._vars;
    }

    public haveUnique(): boolean {
        return this._haveUnique;
    }

    private AggregateVars() {
        // get variables from all examples
        let vars: ExampleVariable[] = [];
        this._haveUnique = false;
        this.examples.forEach(e => {
            e.Variables.forEach(v => {
                let found: ExampleVariable = null;
                vars.forEach(tv => {
                    if (tv.name == v.name) {
                        found = tv;
                    }
                });
                if (found == null) {
                    vars.push(v);
                    if (v.unique) this._haveUnique = true;
                } else {
                    // make sure unique is propagated -- shouldn't be here
                    if (v.unique) {
                        found.unique = true;
                        this._haveUnique = true
                    }
                }
            });
        });
        this._vars = vars;
    }

    private _haveUnique: boolean = false;
    private _vars: ExampleVariable[] = null;
}

