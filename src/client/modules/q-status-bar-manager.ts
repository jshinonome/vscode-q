/**
 * Copyright (c) 2020 Jo Shinonome
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ExtensionContext, StatusBarAlignment, StatusBarItem, window } from 'vscode';
import { QConnManager } from './q-conn-manager';

export class QStatusBarManager {
    private connStatusBar: StatusBarItem;
    private modeStatusBar: StatusBarItem;
    private queryStatusBar: StatusBarItem;
    private unlimitedQueryStatusBar: StatusBarItem;

    public static current: QStatusBarManager | undefined;
    public static create(context: ExtensionContext): QStatusBarManager {
        if (!this.current) {
            this.current = new QStatusBarManager(context);
        }
        return this.current;
    }

    private constructor(context: ExtensionContext) {

        this.connStatusBar = window.createStatusBarItem(StatusBarAlignment.Left, 99);
        context.subscriptions.push(this.connStatusBar);
        this.connStatusBar.show();

        this.modeStatusBar = window.createStatusBarItem(StatusBarAlignment.Left, 100);
        context.subscriptions.push(this.modeStatusBar);
        this.modeStatusBar.show();

        this.queryStatusBar = window.createStatusBarItem(StatusBarAlignment.Left, 98);
        this.queryStatusBar.text = '$(loading)';
        this.queryStatusBar.color = '#F44336';
        this.queryStatusBar.tooltip = 'Querying';
        context.subscriptions.push(this.queryStatusBar);
        this.unlimitedQueryStatusBar = window.createStatusBarItem(StatusBarAlignment.Left, 97);
        this.unlimitedQueryStatusBar.text = '$(flame)';
        this.unlimitedQueryStatusBar.color = '#FFEE58';
        this.unlimitedQueryStatusBar.tooltip = 'Unlimited Query';
        context.subscriptions.push(this.unlimitedQueryStatusBar);

    }


    public static updateConnStatus(name: string | undefined): void {
        if (QConnManager.consoleMode) {
            this.current!.connStatusBar.text = name?.toUpperCase() ?? 'Disconnected';
            this.current!.connStatusBar.color = '#FF79C6';
        } else {
            this.current!.connStatusBar.text = name?.toUpperCase() ?? 'Disconnected';
            this.current!.connStatusBar.color = '#8BE9FD';
        }
    }

    public static updateConnStatusColor(): void {
        if (QConnManager.consoleMode) {
            this.current!.connStatusBar.color = '#FF79C6';
        } else {
            this.current!.connStatusBar.color = '#8BE9FD';
        }
    }

    public static updateModeStatus(): void {
        if (QConnManager.consoleMode) {
            this.current!.modeStatusBar.text = '$(debug-console)';
            this.current!.modeStatusBar.color = '#FF79C6';
        } else {
            this.current!.modeStatusBar.text = '$(graph)';
            this.current!.modeStatusBar.color = '#8BE9FD';
        }
    }

    public static updateQueryStatus(show: boolean): void {
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