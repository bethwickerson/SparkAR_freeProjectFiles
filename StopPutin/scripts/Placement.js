/**
 * (c) Facebook, Inc. and its affiliates. Confidential and proprietary.
 */
// @ts-nocheck

const S = require('Scene');
const R = require('Reactive');
const P = require('Patches');
const I = require('Instruction');
const TG = require('TouchGestures');
const CI = require('CameraInfo');
const {manipulation} = require('./Manipulation.js');
export const D = require('Diagnostics');

const ENABLE_LOGGING = false;
const PLACEMENT_Y_PORTION = 0.70;

// This class implements the logic to help user place the object to the scene
export class Placement {
  constructor() {
    this.isActive = false;
    Promise.all([
      S.root.findFirst('planeTracker0'),
      S.root.findFirst('Camera'),
      S.root.findFirst('placementReticle'),
    ]).then(p=>{
      this.planeTracker = p[0];
      this.camera = p[1];
      this.placementControl = p[2];
      this.initAfterPromiseResolved();
    }).catch(e=>{
      if (ENABLE_LOGGING){
        D.log(e.stack);
      }
    });
  }

  initAfterPromiseResolved() {
    this.setActive(false);
  }

  // Set the class active/inactive and subscribe/unsubscribe touch gestures
  setActive(isActive) {
    if (isActive) {
      this.isActive = true;
      this.active = R.val(true);
      this.unsubscribeScreenTap();
      this.subscribeScreenTap();
      this.beginPlacement();
      manipulation.setActive(false);
      I.bind(R.val(true), 'tap_to_place');
    } else {
      this.isActive = false;
      this.active = R.val(false);
      this.unsubscribeScreenTap();
      this.endPlacement();
    }
  }

  subscribeScreenTap() {
    this.tapSubscription = TG.onTap().subscribe(e=>{
      this.setActive(false);
      manipulation.setActive(true);
    });
  }

  unsubscribeScreenTap() {
    if (this.tapSubscription != null) {
      this.tapSubscription.unsubscribe();
    }
  }

  // Begin object placement. Place the object at the lower center of the screen. Also apply transparency to the object to indicate it's not been placed yet.
  beginPlacement() {
    P.inputs.setBoolean('fadeContent', true);
    this.placementControl.inputs.setBoolean('Active', true);
    this.placementControl.worldTransform = this.planeTracker.worldTransform.toSignal();
    this.screenTrackPoint = R.point2d(
      CI.previewSize.width.mul(0.5),
      CI.previewSize.height.mul(PLACEMENT_Y_PORTION));
    this.planeTracker.trackPoint(this.screenTrackPoint, "CHANGED");
  }

  // Place the object and end object placement. Make the object solid to indicate it's been placed.
  endPlacement() {
    P.inputs.setBoolean('fadeContent', false);
    this.placementControl.inputs.setBoolean('Active', false);

    if (this.screenTrackPoint != null) {
      this.planeTracker.trackPoint(this.screenTrackPoint, "ENDED");
    }
  }
}

export const placement = new Placement();
