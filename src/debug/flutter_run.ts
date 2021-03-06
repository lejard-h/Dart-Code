import { StdIOService, Request, UnknownResponse, UnknownNotification } from "../services/stdio_service";
import * as child_process from "child_process";
import * as f from "../flutter/flutter_types";
import * as fs from "fs";
import { Disposable } from "vscode";
import { OutputEvent } from "vscode-debugadapter";
import { flutterEnv } from "./utils";

export class FlutterRun extends StdIOService {
	constructor(flutterBinPath: string, projectFolder: string, args: string[], logFile: string) {
		super(logFile, true);

		this.createProcess(projectFolder, flutterBinPath, ["run", "--machine"].concat(args), flutterEnv);
	}

	protected shouldHandleMessage(message: string): boolean {
		// Everything in flutter is wrapped in [] so we can tell what to handle.
		return message.startsWith("[") && message.endsWith("]");
	}

	protected processUnhandledMessage(message: string): void {
		this.notify(this.unhandledMessageSubscriptions, message);
	}

	private unhandledMessageSubscriptions: Array<(notification: string) => void> = [];
	public registerForUnhandledMessages(subscriber: (notification: string) => void): Disposable {
		return this.subscribe(this.unhandledMessageSubscriptions, subscriber);
	}

	// TODO: Can we code-gen all this like the analysis server?

	protected handleNotification(evt: UnknownNotification) {
		// console.log(JSON.stringify(evt));
		switch (evt.event) {
			case "app.start":
				this.notify(this.appStartSubscriptions, evt.params as f.AppStart);
				break;
			case "app.debugPort":
				this.notify(this.appDebugPortSubscriptions, evt.params as f.AppDebugPort);
				break;
			case "app.started":
				this.notify(this.appStartedSubscriptions, evt.params as f.AppEvent);
				break;
			case "app.stop":
				this.notify(this.appStopSubscriptions, evt.params as f.AppEvent);
				break;
			case "app.progress":
				this.notify(this.appProgressSubscriptions, evt.params as f.AppEvent);
				break;
		}
	}

	// Subscription lists.

	private appStartSubscriptions: Array<(notification: f.AppStart) => void> = [];
	private appDebugPortSubscriptions: Array<(notification: f.AppDebugPort) => void> = [];
	private appStartedSubscriptions: Array<(notification: f.AppEvent) => void> = [];
	private appStopSubscriptions: Array<(notification: f.AppEvent) => void> = [];
	private appProgressSubscriptions: Array<(notification: f.AppProgress) => void> = [];

	// Request methods.

	public restart(appId: string, pause: boolean, fullRestart?: boolean): Thenable<any> {
		return this.sendRequest("app.restart", { appId, fullRestart: fullRestart === true, pause });
	}

	public stop(appId: string): Thenable<UnknownResponse> {
		return this.sendRequest("app.stop", { appId });
	}

	public callServiceExtension(appId: string, methodName: string, params: any): Thenable<any> {
		return this.sendRequest("app.callServiceExtension", { appId, methodName, params });
	}

	// Subscription methods.

	public registerForAppStart(subscriber: (notification: f.AppStart) => void): Disposable {
		return this.subscribe(this.appStartSubscriptions, subscriber);
	}

	public registerForAppDebugPort(subscriber: (notification: f.AppDebugPort) => void): Disposable {
		return this.subscribe(this.appDebugPortSubscriptions, subscriber);
	}

	public registerForAppStarted(subscriber: (notification: f.AppEvent) => void): Disposable {
		return this.subscribe(this.appStartedSubscriptions, subscriber);
	}

	public registerForAppStop(subscriber: (notification: f.AppEvent) => void): Disposable {
		return this.subscribe(this.appStopSubscriptions, subscriber);
	}

	public registerForAppProgress(subscriber: (notification: f.AppProgress) => void): Disposable {
		return this.subscribe(this.appProgressSubscriptions, subscriber);
	}
}
