
/**
 * Generated using theia-plugin-generator
 */

import * as theia from '@theia/plugin';

export function start() {
    console.log(theia.window.state);
    theia.window.showInformationMessage("hello from backend plugin");
    theia.window.showInformationMessage("bouh "+ theia.env.getQueryParameter("factory-id"));
}

export function stop() {

}
