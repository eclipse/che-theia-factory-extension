/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import * as theia from '@theia/plugin';
import * as che from '@eclipse-che/plugin';
import { TheiaCloneCommand, TheiaCommand } from './theia-commands';

export enum ActionId {
    OPEN_FILE = 'openFile',
    RUN_COMMAND = 'runCommand'
}

/**
 * Provides basic Eclipse Che factory features to be executed at startup of the Theia browser IDE:
 * - checking/retrieving factory-id from URL
 * - request che factory api to get the factory definition
 * - clone the projects defined in the factory definition
 * - checkout branch if needed
 */
export class FactoryTheiaClient {

    constructor(protected projectsRoot: string) {
    }

    async start() {
        const factoryId = theia.env.getQueryParameter('factory-id');

        if (!factoryId || typeof factoryId !== 'string') {
            return;
        }

        let factory: che.Factory;
        try {
            factory = await che.factory.getById(factoryId);
        } catch (e) {
            theia.window.showErrorMessage('Unable to get factory. ' + e.message);
            return;
        }

        const cloneCommandList = await this.extractCloneCommands(factory);
        const onProjectsImportedCommandList = this.extractOnProjectsImportedCommands(factory);

        // TODO const onAppLoadedCommandList = factory.getOnAppLoadedActions().map(action => new TheiaCommand(action.id, action.parameters));
        // TODO const onAppClosedCommandList = factory.getOnAppLoadedActions().map(action => new TheiaCommand(action.id, action.parameters));
        // TODO register trigger for on appClosed ... onStop method ?
        // - on web app closed
        // TODO await this.executeOnAppLoadedCommands(onAppLoadedCommandList)

        await this.executeCloneCommands(cloneCommandList);
        await this.executeOnProjectsImportedCommands(onProjectsImportedCommandList);
    }

    private async extractCloneCommands(factory: che.Factory) {
        const instance = this;

        if (!factory.workspace || !factory.workspace.projects) {
            return [];
        }

        return factory.workspace.projects.map(
            project => new TheiaCloneCommand(project, instance.projectsRoot)
        );
    }

    private extractOnProjectsImportedCommands(factory: che.Factory) {
        if (!factory.ide || !factory.ide.onProjectsLoaded || !factory.ide.onProjectsLoaded.actions) {
            return [];
        }

        return factory.ide.onProjectsLoaded.actions.map(
            action => new TheiaCommand(action.id, action.properties)
        );
    }

    private async executeCloneCommands(cloneCommandList: TheiaCloneCommand[]) {
        await Promise.all(
            cloneCommandList.map(cloneCommand => cloneCommand.execute())
        );

        theia.window.showInformationMessage("Che Factory: Finished cloning projects.");
    }

    private async executeOnProjectsImportedCommands(onProjectImportedCommandList: TheiaCommand[]) {
        await Promise.all(
            onProjectImportedCommandList.map(onProjectImportedCommand => onProjectImportedCommand.execute())
        );

        theia.window.showInformationMessage("Che Factory: Finished executing 'onProjectImported' command actions.");
    }

}
