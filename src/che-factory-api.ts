/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { FactoryService, IFactoryService } from './resources';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { IFactory, IFactoryAction } from './types';
import { IProjectConfig } from '@eclipse-che/workspace-client';
import * as theia from '@theia/plugin';

export class CheFactoryApi {
    private static axiosInstance: AxiosInstance = axios;
    private factoryService: IFactoryService | undefined;
    private currentFactory: CheFactory | undefined;

    async retrieveFactoryDefinition(factoryId: string | undefined): Promise<CheFactory | undefined> {
        if (!factoryId) {
            return undefined;
        }
        try {
            if (!this.factoryService) {
                const cheApiInternalVar = await theia.env.getEnvVariable('CHE_API_INTERNAL');
                const cheMachineToken = await theia.env.getEnvVariable('CHE_MACHINE_TOKEN');
                if (!cheApiInternalVar) {
                    return undefined;
                }
                this.factoryService = new FactoryService(
                    CheFactoryApi.axiosInstance,
                    cheApiInternalVar,
                    cheMachineToken ? { "Authorization": "Bearer " + cheMachineToken } : undefined
                );
            }
            const response: AxiosResponse<IFactory> = await this.factoryService.getById<IFactory>(factoryId);
            if (!response || !response.data) {
                return undefined;
            }
            this.currentFactory = new CheFactory(response.data);
        } catch (e) {
            theia.window.showErrorMessage("Failed to fetch factory definition: " + e.message);
        }
        return this.currentFactory;
    }

    getCurrentFactory(): CheFactory | undefined {
        return this.currentFactory;
    }

}

export class CheFactory {
    constructor(
        protected factory: IFactory | undefined
    ) {
    }
    getProjects(): CheProject[] {
        if (!this.factory || !this.factory.workspace || !this.factory.workspace.projects) {
            return [];
        }

        return this.factory.workspace.projects.map((project: IProjectConfig) => new CheProject(project));
    }

    getOnProjectsImportedActions(): CheFactoryAction[] {
        if (!this.factory || !this.factory.ide || !this.factory.ide.onProjectsLoaded || !this.factory.ide.onProjectsLoaded.actions) {
            return [];
        }

        return this.factory.ide.onProjectsLoaded.actions.map((action: IFactoryAction) => new CheFactoryAction(action.id, action.properties));
    }

    getFactoryOnAppLoadedActions(factory: IFactory | undefined): Array<IFactoryAction> {
        if (!factory || !factory.ide || !factory.ide.onAppLoaded || !factory.ide.onAppLoaded.actions) {
            return [];
        }

        return factory.ide.onAppLoaded.actions;
    }

    getFactoryOnAppClosedActions(factory: IFactory | undefined): Array<IFactoryAction> {
        if (!factory || !factory.ide || !factory.ide.onAppClosed || !factory.ide.onAppClosed.actions) {
            return [];
        }
        return factory.ide.onAppClosed.actions;
    }

}

export class CheProject {
    constructor(
        protected project: IProjectConfig
    ) { }

    getPath(): string {
        return this.project.path;
    }

    getLocationURI(): string | undefined {
        if (!this.project.source || !this.project.source.location) {
            return undefined;
        }
        return this.project.source.location;
    }

    getCheckoutBranch(): string | undefined {
        if (!this.project.source || !this.project.source.parameters['branch']) {
            return undefined;
        }
        return this.project.source.parameters['branch'];
    }
}

export class CheFactoryAction {

    constructor(
        protected readonly id: string,
        protected readonly properties?: {
            name?: string,
            file?: string,
            greetingTitle?: string,
            greetingContentUrl?: string
        }
    ) { }

    public getId() {
        return this.id;
    }

    public getProperties() {
        return this.properties;
    }
}
