import envPaths from 'env-paths';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { Event, EventEmitter, TreeDataProvider, TreeItem, TreeItemCollapsibleState, window } from 'vscode';
import { QCfg } from './q-conn-manager';
import { qServers } from './q-server-tree';

const cfgPath = path.join(envPaths('vscode-q').config, 'q-discovery-server-cfg.json');
const discoveredProcessTag = 'dsc';
type DiscoveryServerCfg = {
    url: string;
    user: string;
    password: string;
    useTLS: boolean;
    tags: string;
}

const rootDiscoveryServerCfg: DiscoveryServerCfg = {
    url: '',
    user: '',
    password: '',
    useTLS: false,
    tags: 'root',
};

class DiscoveryServer extends TreeItem implements TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData: EventEmitter<DiscoveryServer | undefined> = new EventEmitter<DiscoveryServer | undefined>();
    readonly onDidChangeTreeData: Event<DiscoveryServer | undefined> = this._onDidChangeTreeData.event;

    _parent: DiscoveryServer | null;
    _children: DiscoveryServerCfg[] = [];
    url: string;
    user: string;
    password: string;
    useTLS: boolean;
    tags: string;

    public static customizedAuthInstalled = false;

    constructor(cfg: DiscoveryServerCfg, parent: DiscoveryServer | null) {
        super(cfg.tags, cfg.tags === 'root' ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None);
        this._parent = parent;
        this.url = cfg.url;
        this.user = cfg.user;
        this.password = cfg.password;
        this.useTLS = cfg.useTLS;
        this.tags = cfg.tags;
        this.tooltip = `${this.tags} - ${this.user}`;
    }

    reload() {
        if (!this._parent) {
            // read the discovery server configuration file
            if (!fs.existsSync(cfgPath)) {
                fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
                fs.writeFileSync(cfgPath, '[]', 'utf8');
            }
            (JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as DiscoveryServerCfg[])
                .forEach(cfg => this.appendChild(cfg));
        }
        this._onDidChangeTreeData.fire(undefined);
    }

    save() {
        if (!this._parent) {
            fs.writeFileSync(cfgPath,
                JSON.stringify(this._children.map(
                    server => ({
                        url: server.url,
                        user: server.user,
                        password: server.password,
                        useTLS: server.useTLS,
                        tags: server.tags,
                    })), null, 2), 'utf8');
        }
    }

    appendChild(cfg: DiscoveryServerCfg) {
        const server = new DiscoveryServer(cfg, this);
        this._children = this._children.filter(child => child.tags !== cfg.tags);
        this._children.push(server);
        this._children.sort((c1, c2) => c1.tags.localeCompare(c2.tags));
    }

    removeChildByTags(tags: string) {
        this._children = this._children.filter(child => child.tags !== tags);
    }

    dispose() {
        if (this._parent) {
            this._parent.removeChildByTags(this.tags);
            this._parent.save();
            this._parent.reload();
            this._parent = null;
        }
    }

    getTreeItem(e: TreeItem): TreeItem {
        return e;
    }

    getChildren(e?: TreeItem): Thenable<TreeItem[]> {
        if (e instanceof DiscoveryServer) {
            return Promise.resolve([]);
        } else {
            return Promise.resolve(
                this._children as TreeItem[]
            );
        }
    }

    download() {
        const tags = `${discoveredProcessTag},${this.tags}`;
        try {
            http.get(this.url, resp => {
                let data = '';
                resp.on('data', chunk => { data += chunk; });
                resp.on('end', () => {
                    const msg = data.toString();
                    let processInfo: ProcessInfo[] = [];
                    try {
                        processInfo = JSON.parse(msg);
                    } catch (_error) {
                        window.showErrorMessage(`[Discovery Server] Failed to parse "${msg.slice(0, 30)}"`);
                        return;
                    }
                    const cfg: QCfg[] = processInfo.map(info => ({
                        host: info.host,
                        port: info.port,
                        user: this.user,
                        password: this.password,
                        label: info.label,
                        tags: tags,
                        uniqLabel: `${tags},${info.label}`,
                        useCustomizedAuth: false,
                        useTLS: this.useTLS,
                    }));
                    cfg.sort((c1, c2) => c1.label.localeCompare(c2.label));
                    qServers.reload(cfg, tags);
                    window.showInformationMessage(`[Discovery Server] Discovered ${cfg.length} processes with "${tags}"`);
                });
                resp.on('error',
                    err => window.showErrorMessage(`[Discovery Server] Failed to discover processes, "${err}"`));
            });
        } catch (error) {
            window.showErrorMessage(`[Discovery Server] Failed to discover processes, "${error}"`);
        }
    }

    contextValue = 'discovery-server';
}

type ProcessInfo = {
    host: string,
    port: number,
    label: string,
}

const discoveryServerTree = new DiscoveryServer(rootDiscoveryServerCfg, null);
discoveryServerTree.reload();

export { DiscoveryServer, DiscoveryServerCfg, discoveryServerTree, discoveredProcessTag };
