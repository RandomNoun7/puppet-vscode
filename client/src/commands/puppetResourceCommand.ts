'use strict';

import * as vscode from 'vscode';
import { PuppetResourceRequestParams, PuppetResourceRequest } from '../messages';
import { IConnectionManager, ConnectionStatus } from '../connection';

class RequestParams implements PuppetResourceRequestParams {
  typename: string;
  title: string;
}

export class puppetResourceCommand {
  private _connectionManager: IConnectionManager = undefined;

  constructor(connMgr: IConnectionManager) {
    this._connectionManager = connMgr;
  }

  private pickPuppetResource(): Thenable<string> {
    let options: vscode.QuickPickOptions = {
      placeHolder: "Enter a Puppet resource to interrogate",
      matchOnDescription: true,
      matchOnDetail: true
    };
    return vscode.window.showInputBox(options);
  }

  public run() {
    var thisCommand = this

    if (thisCommand._connectionManager.status != ConnectionStatus.Running ) {
      vscode.window.showInformationMessage("Puppet Resource is not available as the Language Server is not ready");
      return
    }

    this.pickPuppetResource().then((moduleName) => {
      if (moduleName) {

        let editor = vscode.window.activeTextEditor;
        if (!editor) { return; }

        let doc = editor.document;
        let requestParams = new RequestParams;
        requestParams.typename = moduleName;

        thisCommand._connectionManager.languageClient
          .sendRequest(PuppetResourceRequest.type, requestParams)
          .then( (resourceResult) => {
            if (resourceResult.error != undefined && resourceResult.error.length > 0) {
            // TODO Log any errors
              console.error(resourceResult.error);
              return;
            }
            if (resourceResult.data == undefined || resourceResult.data.length == 0) return;

            if (editor.selection.isEmpty) {
              const position = editor.selection.active;
              var newPosition = position.with(position.line, 0);
            }else{
              var newPosition = new vscode.Position(0, 0);
            }

            this.editCurrentDocument(doc.uri, resourceResult.data, newPosition);
          });
      }
    });
  }

  private editCurrentDocument(uri, text, position) {
    let edit = new vscode.WorkspaceEdit();
    edit.insert(uri, position, text);
    vscode.workspace.applyEdit(edit);
  }

  public dispose(): any {
  }
}