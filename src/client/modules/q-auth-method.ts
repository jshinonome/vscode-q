/**
 * Copyright (c) 2021 Morgan Stanley
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import * as q from 'node-q';

export class AuthMethod {
    id: string = "invalid";
    name: string = "Invalid";

    generateCredentials(params: q.ConnectionParameters): Promise<q.ConnectionParameters> {
        throw "not implemented";
    }

}

export class UserPasswordAuth extends AuthMethod {
    id: string = "userPass";
    name: string = "Username and Password";

    generateCredentials(params: q.ConnectionParameters): Promise<q.ConnectionParameters> {
        return Promise.resolve(params);
    }
}

export let authMethods: AuthMethod[] = [new UserPasswordAuth()];

for (let p of require('../../../package.json').q_auth_modules) {
    require('./auth/'+p);
}
