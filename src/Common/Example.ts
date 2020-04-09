/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { timingSafeEqual } from "crypto";

export enum ReferenceType
{
    STORAGE,
    VIRTUAL_NETWORK,
    SUBNET
}

export class ExampleWarning
{
    public constructor(exampleName: string,
                       description: string)
    {
        this.ExampleName = exampleName;
        this.Description = description;
    }

    public ExampleName: string;
    public Description: string;
}

export class ExampleVariable
{
    public constructor(name: string, value: string, swaggerName: string)
    {
        this.name = name;
        this.value = value;
        this.swaggerName = swaggerName;
    }
    public name: string;
    public value: string;
    public swaggerName: string;
}

export class Example
{
    public constructor (example: any,
                        url: string,
                        method: string,
                        name: string,
                        filename: string,
                        variables: ExampleVariable[],
                        references: string[],
                        referenceTypes: ReferenceType[],
                        operationId: string,
                        methodId: string,
                        operationName: string,
                        methodName: string,
                        longRunning: boolean,
                        warnings: ExampleWarning[])
    {
        this.Example = example;
        this.Url = url;
        this.Method = method;
        this.Id = name;
        this.Title = name;
        this.Filename = filename;
        this.Variables = variables;
        this.References = references;
        this.ReferenceTypes = referenceTypes;
        this.OperationId = operationId;
        this.MethodId = methodId;
        this.OperationName = operationName;
        this.MethodName = methodName;
        this.LongRunning = longRunning;
        this.Warnings = warnings;
    }

    public Method: string;
    public Filename: string;
    public OperationId: string;
    public MethodId: string;
    public OperationName: string;
    public MethodName: string;
    public Url: string;
    public Id: string;
    public Title: string;
    public Variables: ExampleVariable[]; 
    public Example: any;
    public References: string[];
    public ReferenceTypes: ReferenceType[];
    public LongRunning: boolean = false;
    public Warnings: ExampleWarning[] = [];

    public GetExampleApiVersion(): string
    {
        return this.Example["parameters"]["api-version"];
    }

    public IsExampleLongRunning(): boolean
    {
        var lro: any = null;
        //var method = this.Operations[this._currentOperation].methods[this._currentMethod];
        // XXX - find fix for this
        //method.Extensions.TryGetValue(AutoRest.Extensions.Azure.AzureExtensions.LongRunningExtension, out lro);
        return (lro != null);
    }

    public ExampleHasBody(): boolean
    {
        return (this.GetExampleBody() != null);
    }

    public CloneExampleParameters(): any
    {
        return JSON.parse(JSON.stringify(this.Example["parameters"]));
    }

    public GetExampleBody(): any
    {
        var body: any = null;

        if ((this.Method != "get") && (this.Method != "delete"))
        {
            var props: any  = this.Example["parameters"];

            var bodyName: string = "";

            for (var pp in props)
            {
                var bodyObject: any = props[pp];

                if (typeof bodyObject == 'object')
                {
                    bodyName = pp;
                    break;
                }
            }

            body = this.Example["parameters"][bodyName];
        }

        return body;
    }
}
