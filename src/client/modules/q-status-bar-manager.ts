/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ColorThemeKind, ExtensionContext, StatusBarAlignment, StatusBarItem, window } from 'vscode';
import { QConnManager } from './q-conn-manager';

export class QStatusBarManager {
    private connStatusBar: StatusBarItem;
    private queryStatusBar: StatusBarItem;
    private unlimitedQueryStatusBar: StatusBarItem;
    private queryModeStatusBar: StatusBarItem;
    private isLightTheme = window.activeColorTheme.kind === ColorThemeKind.Light;
    public static current: QStatusBarManager | undefined;
    public static create(context: ExtensionContext): QStatusBarManager {
        if (!this.current) {
            this.current = new QStatusBarManager(context);
        }
        return this.current;
    }

    private constructor(context: ExtensionContext) {

        this.queryModeStatusBar = window.createStatusBarItem(StatusBarAlignment.Left, 99);
        context.subscriptions.push(this.queryModeStatusBar);
        this.queryModeStatusBar.color = this.isLightTheme ? '#512DA8' : '#BD93F9';
        this.queryModeStatusBar.command = 'q-client.switchMode';
        this.queryModeStatusBar.text = '$(chevron-left)q ' + QConnManager.queryMode;
        this.queryModeStatusBar.show();

        this.connStatusBar = window.createStatusBarItem(StatusBarAlignment.Left, 98);
        context.subscriptions.push(this.connStatusBar);
        this.connStatusBar.color = this.isLightTheme ? '#512DA8' : '#BD93F9';
        this.connStatusBar.command = 'q-client.connectEntry';
        this.connStatusBar.show();

        this.queryStatusBar = window.createStatusBarItem(StatusBarAlignment.Left, 97);
        this.queryStatusBar.text = '$(play-circle)';
        this.queryStatusBar.color = '#4CAF50';
        this.queryStatusBar.tooltip = 'Querying';
        context.subscriptions.push(this.queryStatusBar);
        this.unlimitedQueryStatusBar = window.createStatusBarItem(StatusBarAlignment.Left, 96);
        this.unlimitedQueryStatusBar.text = '$(flame)';
        this.unlimitedQueryStatusBar.color = '#F44336';
        this.unlimitedQueryStatusBar.tooltip = 'Unlimited Query';
        context.subscriptions.push(this.unlimitedQueryStatusBar);

    }


    public static updateConnStatus(label: string | undefined): void {
        const text = (label ?? 'Disconnected').replace(',', '-');
        this.current!.connStatusBar.text = text + ' $(chevron-right)';
    }

    public static updateQueryModeStatus(): void {
        this.current!.queryModeStatusBar.text = '$(chevron-left)q ' + QConnManager.queryMode;
    }

    public static toggleQueryStatus(show: boolean): void {
        if (show) {
            this.current!.queryStatusBar.show();
        } else {
            this.current!.queryStatusBar.hide();
        }
    }

    public static updateUnlimitedQueryStatus(isLimited: boolean): void {
        if (isLimited) {
            this.current!.unlimitedQueryStatusBar.hide();
        } else {
            this.current!.unlimitedQueryStatusBar.show();
        }
    }
}
