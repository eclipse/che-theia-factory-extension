/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { ProjectConfig } from "@eclipse-che/plugin";

export function updateOrCreateGitProject(
    projects: ProjectConfig[], projectPath: string, projectGitLocation: string, projectGitRemoteBranch: string): ProjectConfig[] {

    const filteredProject = projects.filter(project => project.path === projectPath);

    if (filteredProject.length === 0) {
        const projectName = projectPath.split('/').pop();

        // create a new one
        projects.push({
            "name": projectName ? projectName : "new-project",
            "attributes": {},
            "source": {
                "location": projectGitLocation,
                "type": "git",
                "parameters": {
                    "branch": projectGitRemoteBranch
                }
            },
            "path": projectPath,
            "description": "",
            "mixins": []
        });
        return projects;
    }

    filteredProject.forEach(project => {
        if (!project.source) {
            project.source = {
                type: 'git',
                location: '',
                parameters: {}
            };
        }
        project.source.location = projectGitLocation;
        if (!project.source.parameters) {
            project.source.parameters = {};
        }
        project.source.parameters['branch'] = projectGitRemoteBranch;
    });

    return projects;
}

export function deleteGitProject(
    projects: ProjectConfig[],
    projectPath: string): ProjectConfig[] {

    projects
        .filter(project => project.path === projectPath)
        .forEach(project => {
            projects.splice(projects.indexOf(project));
        });

    return projects;
}
