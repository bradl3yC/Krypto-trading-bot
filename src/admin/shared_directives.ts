/// <reference path="../common/models.ts" />
/// <reference path="../common/messaging.ts" />

import {NgModule, Injectable, Inject} from '@angular/core';
import moment = require('moment');
import * as io from 'socket.io-client';

import Messaging = require("../common/messaging");
import Models = require("../common/models");

@Injectable()
export class FireFactory {
    constructor(@Inject('socket') private socket: SocketIOClient.Socket) {}

    public getFire = <T>(topic : string) : Messaging.IFire<T> => {
        return new Messaging.Fire<T>(topic, this.socket);
    }
}

@Injectable()
export class SubscriberFactory {
    constructor(@Inject('socket') private socket: SocketIOClient.Socket) {}

    public getSubscriber = <T>(scope : any, topic : string) : Messaging.ISubscribe<T> => {
        return new EvalAsyncSubscriber<T>(scope, topic, this.socket);
    }
}

class EvalAsyncSubscriber<T> implements Messaging.ISubscribe<T> {
    private _wrapped : Messaging.ISubscribe<T>;

    constructor(private _scope : any, topic : string, io : any) {
        this._wrapped = new Messaging.Subscriber<T>(topic, io);
    }

    public registerSubscriber = (incrementalHandler : (msg : T) => void, snapshotHandler : (msgs : T[]) => void) => {
        return this._wrapped.registerSubscriber(
            x => this._scope.run(() => incrementalHandler(x)),
            xs => this._scope.run(() => snapshotHandler(xs)))
    };

    public registerDisconnectedHandler = (handler : () => void) => {
        return this._wrapped.registerDisconnectedHandler(() => this._scope.run(handler));
    };

    public registerConnectHandler = (handler : () => void) => {
        return this._wrapped.registerConnectHandler(() => this._scope.run(handler));
    };

    public disconnect = () => this._wrapped.disconnect();

    public get connected() { return this._wrapped.connected; }
}

@NgModule({
  providers: [
    SubscriberFactory,
    FireFactory,
    {
      provide: 'socket',
      useValue: io()
    }
  ]
})
export class SharedModule {}