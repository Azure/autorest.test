﻿/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Example, ExampleVariable } from "./Example"
import { IsSpecialName } from "../Common/Helpers"

export class Model
{
    public constructor(examples: Example[],
        config: any,
        namespace: string,
        cliCommandName: string,
        mgmtClientName: string,
        track2: boolean,
        methodsTotal: number,
        methodsCovered: number,
        examplesTotal: number,
        examplesTested: number,
        coverageMap: {})
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
        this.coverageMap = coverageMap;
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
    public coverageMap: {};

    public needCompute() : boolean {
        if (this.namespace == "azure.mgmt.compute") {
            return false;
        }

        return (this.needVirtualMachine() ||
                this.needAvailabilitySet());
    }

    public needNetwork() : boolean {
        if (this.namespace == "azure.mgmt.network") {
            return false;
        }

        return (this.needVirtualNetwork() ||
                this.needSubnet() ||
                this.needNetworkInterface() ||
                this.needLoadBalancer());
    }

    public needStorage() : boolean {
        if (this.namespace == "azure.mgmt.storage") {
            return false;
        }

        return this.HaveVarMatching("^storage_account_.*$");
    }

    public needKeyvault() : boolean {
        return false;
    }

    public needPrivateDns() : boolean {
        if (this.namespace == "azure.mgmt.privatedns") {
            return false;
        }

        return (this.needPrivateDnsZone());
    }

    public needPrivateDnsZone() : boolean {
        if (this.namespace == "azure.mgmt.privatedns") {
            return false;
        }
        return this.HaveVarMatching("^private_dns_.*$");
    }

    public needNetworkInterface() : boolean {
        if (this.namespace == "azure.mgmt.network") {
            return false;
        }
        return (this.HaveVarMatching("^network_interface_.*$") ||
                this.needVirtualMachine());
    }

    public needVirtualNetwork() : boolean {
        if (this.namespace == "azure.mgmt.network") {
            return false;
        }
        return (this.HaveVarMatching("^virtual_network_.*$") ||
                this.needNetworkInterface());
    }

    public needLoadBalancer() : boolean {
        if (this.namespace == "azure.mgmt.network") {
            return false;
        }
        return this.HaveVarMatching("^load_balancer_.*$");
    }

    public needSubnet() : boolean {
        if (this.namespace == "azure.mgmt.network") {
            return false;
        }
        return (this.HaveVarMatching("^subnet_.*$") ||
                this.needNetworkInterface());
    }

    public needVirtualMachine() : boolean {
        return this.HaveVarMatching("^virtual_machine_.*$");
    }

    public needAvailabilitySet() : boolean {
        return this.HaveVarMatching("^availability_set_.*$");
    }

    public needResourceGroup() : boolean {
        return this.HaveVarMatching("^resource_group.*$");
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

    private HaveVarMatching(exp: string) : boolean {
        let regexp = new RegExp(exp);
        let vars: ExampleVariable[] = this.getVars();

        for (let i = 0; i < vars.length; i++) {
            if (regexp.test(vars[i].name)) return true;
        }
        return false;
    }

    private AggregateVars() {
        // get variables from all examples
        this._vars = [];
        this._haveUnique = false;
        this.examples.forEach(e => {
            e.Variables.forEach(v => {

                let found: ExampleVariable = this.findVar(v.name);
                if (found == null) {
                    this._vars.push(v);
                    if (v.unique) this._haveUnique = true;
                } else {
                    // make sure unique is propagated -- shouldn't be here
                    if (v.unique) {
                        found.unique = true;
                        this._haveUnique = true
                    }

                    // special names always take precedence
                    if (IsSpecialName(v.value)) {
                        found.value = v.value;
                    }
                }
            });
        });

        if (this.needVirtualMachine() && !this.findVar("virtual_machine_name")) {
            this._vars.push(new ExampleVariable("virtual_machine_name", "myVirtualMachine", "virtualMachineName"));
        }
        if (this.needVirtualNetwork() && !this.findVar("virtual_network_name")) {
            this._vars.push(new ExampleVariable("virtual_network_name", "myVirtualNetwork", "virtualNetworkName"));
        }
        if (this.needSubnet() && !this.findVar("subnet_name")) {
            this._vars.push(new ExampleVariable("subnet_name", "mySubnet", "subnetName"));
        }
    }

    private findVar(name: string): ExampleVariable {
        let found: ExampleVariable = null;
        this._vars.forEach(tv => {
            if (tv.name == name) {
                found = tv;
            }
        });
        return found;
    }

    private _haveUnique: boolean = false;
    private _vars: ExampleVariable[] = null;
}

