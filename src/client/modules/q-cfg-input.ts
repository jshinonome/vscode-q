/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { Disposable, QuickInput, QuickInputButton, QuickInputButtons, window } from 'vscode';
import { QCfg, QConnManager } from './q-conn-manager';


export async function qCfgInput(qcfg: QCfg | undefined, requireUnique = true): Promise<QCfg> {


    async function collectInputs() {
        const state = qcfg ? qcfg :
            {
                host: '',
                port: 0,
                user: '',
                password: '',
                socketNoDelay: false, socketTimeout: 0,
                label: ''
            } as QCfg;
        await QCfgInput.run(input => inputHost(input, state));
        return state as QCfg;
    }

    const title = 'Create q Server';

    async function inputHost(input: QCfgInput, state: QCfg) {
        state.host = await input.showInputBox({
            title,
            step: 1,
            totalSteps: 7,
            value: state.host,
            prompt: 'Input q server hostname',
            validate: validateNothing,
            shouldResume: shouldResume
        });
        return (input: QCfgInput) => inputPort(input, state);
    }

    async function inputPort(input: QCfgInput, state: QCfg) {
        const value = await input.showInputBox({
            title,
            step: 2,
            totalSteps: 7,
            value: state.port.toString(),
            prompt: 'Input q server port',
            validate: validateNumber,
            shouldResume: shouldResume
        });
        state.port = Number(value);
        return (input: QCfgInput) => inputUser(input, state);
    }

    async function inputUser(input: QCfgInput, state: QCfg) {
        state.user = await input.showInputBox({
            title,
            step: 3,
            totalSteps: 7,
            value: state.user,
            prompt: `Input user for ${state.host}:${state.port}`,
            validate: validateNothing,
            shouldResume: shouldResume
        });
        return (input: QCfgInput) => inputPassword(input, state);
    }

    async function inputPassword(input: QCfgInput, state: QCfg) {
        state.password = await input.showInputBox({
            title,
            step: 4,
            totalSteps: 7,
            value: state.password,
            prompt: `Input password for ${state.host}:${state.port}:${state.user}`,
            password: true,
            validate: validateNothing,
            shouldResume: shouldResume
        });
        return (input: QCfgInput) => inputSocketNoDelay(input, state);
    }

    async function inputSocketNoDelay(input: QCfgInput, state: QCfg) {
        const value = await input.showInputBox({
            title,
            step: 5,
            totalSteps: 7,
            value: `${state.socketNoDelay}`,
            prompt: 'Set Socket No Delay (true|false)',
            validate: validateBoolean,
            shouldResume: shouldResume
        });
        state.socketNoDelay = value === 'true' ? true : false;
        return (input: QCfgInput) => inputSocketTimeout(input, state);
    }

    async function inputSocketTimeout(input: QCfgInput, state: QCfg) {
        const value = await input.showInputBox({
            title,
            step: 6,
            totalSteps: 7,
            value: state.socketTimeout.toString(),
            prompt: 'Input query timeout(ms)',
            validate: validateNumber,
            shouldResume: shouldResume
        });
        state.socketTimeout = Number(value);
        return (input: QCfgInput) => inputLabel(input, state);
    }

    async function inputLabel(input: QCfgInput, state: QCfg) {
        if (state.label === '') {
            state.label = state.host + '-' + state.port;
        }
        state.label = await input.showInputBox({
            title,
            step: 7,
            totalSteps: 7,
            value: state.label,
            prompt: `Input label for ${state.host}:${state.port}`,
            validate: validateUnique,
            shouldResume: shouldResume
        });
    }

    function shouldResume() {
        // Could show a notification with the option to resume.
        return new Promise<boolean>(() => {
            // noop
        });
    }

    async function validateNumber(num: string) {
        return num !== '' && isNaN(Number(num)) ? 'Require Number' : undefined;
    }

    async function validateBoolean(bool: string) {
        return bool !== 'true' && bool !== 'false' ? 'Require true/false' : undefined;
    }

    async function validateNothing() {
        return undefined;
    }

    async function validateUnique(label: string) {
        if (requireUnique) {
            return QConnManager.current?.qConnPool.has(label) ? 'Label exists' : undefined;
        } else {
            return undefined;
        }
    }

    const state = await collectInputs();
    // window.showInformationMessage(`Creating q Server '${state.label}'`);
    return state;
}


class InputFlowAction {
    static back = new InputFlowAction();
    static cancel = new InputFlowAction();
    static resume = new InputFlowAction();
}

type InputStep = (input: QCfgInput) => Thenable<InputStep | void>;

interface InputBoxParameters {
    title: string;
    step: number;
    totalSteps: number;
    value: string;
    prompt: string;
    password?: boolean;
    validate: (value: string) => Promise<string | undefined>;
    buttons?: QuickInputButton[];
    shouldResume: () => Thenable<boolean>;
}

class QCfgInput {

    static async run(start: InputStep) {
        const input = new QCfgInput();
        return input.stepThrough(start);
    }

    private current?: QuickInput;
    private steps: InputStep[] = [];

    private async stepThrough(start: InputStep) {
        let step: InputStep | void = start;
        while (step) {
            this.steps.push(step);
            if (this.current) {
                this.current.enabled = false;
                this.current.busy = true;
            }
            try {
                step = await step(this);
            } catch (err) {
                if (err === InputFlowAction.back) {
                    this.steps.pop();
                    step = this.steps.pop();
                } else if (err === InputFlowAction.resume) {
                    step = this.steps.pop();
                } else if (err === InputFlowAction.cancel) {
                    step = undefined;
                } else {
                    throw err;
                }
            }
        }
        if (this.current) {
            this.current.dispose();
        }
    }

    async showInputBox<P extends InputBoxParameters>({ title, step, totalSteps, value, prompt, password, validate, buttons, shouldResume }: P) {
        const disposables: Disposable[] = [];
        try {
            return await new Promise<string | (P extends { buttons: (infer I)[] } ? I : never)>((resolve, reject) => {
                const input = window.createInputBox();
                input.title = title;
                input.step = step;
                input.totalSteps = totalSteps;
                input.value = value || '';
                input.prompt = prompt;
                input.password = password ? password : false;
                input.buttons = [
                    ...(this.steps.length > 1 ? [QuickInputButtons.Back] : []),
                    ...(buttons || [])
                ];
                let validating = validate('');
                disposables.push(
                    input.onDidTriggerButton(item => {
                        if (item === QuickInputButtons.Back) {
                            reject(InputFlowAction.back);
                        } else {
                            resolve(<any>item);
                        }
                    }),
                    input.onDidAccept(async () => {
                        const value = input.value;
                        input.enabled = false;
                        input.busy = true;
                        if (!(await validate(value))) {
                            resolve(value);
                        }
                        input.enabled = true;
                        input.busy = false;
                    }),
                    input.onDidChangeValue(async text => {
                        const current = validate(text);
                        validating = current;
                        const validationMessage = await current;
                        if (current === validating) {
                            input.validationMessage = validationMessage;
                        }
                    }),
                    input.onDidHide(() => {
                        (async () => {
                            reject(shouldResume && await shouldResume() ? InputFlowAction.resume : InputFlowAction.cancel);
                        })()
                            .catch(reject);
                    })
                );
                if (this.current) {
                    this.current.dispose();
                }
                this.current = input;
                this.current.show();
            });
        } finally {
            disposables.forEach(d => d.dispose());
        }
    }
}
