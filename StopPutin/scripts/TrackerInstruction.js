/**
 * (c) Facebook, Inc. and its affiliates. Confidential and proprietary.
 */
// @ts-nocheck

const S = require('Scene');
const R = require('Reactive');
const I = require('Instruction');
const T = require('Time');
const CI = require('CameraInfo');
const PT = require('PlaneTracking');
const {placement} = require('./Placement.js');
const {manipulation} = require('./Manipulation.js');
export const D = require('Diagnostics');

const ENABLE_LOGGING = false;
const RWS_SCALE_ADJUSTMENT = 1.0;
const WAIT_FOR_NEXT_FRAME = 1;
const DEVICE_ELEVATION_EXPECTATION_FOR_NON_REAL_SCALE = 0.40;
const DELAY_TO_WORKAROUND_CRASH = 500;

// This class check the status of Real-World Scale tracking and display proper instructions. Also, it can initiate a fallback logic for unsupported devices using the distance from device to ground to estimate the scale of the scene.
export class TrackerInstruction {
  constructor() {
    Promise.all([
      S.root.findFirst('trackerInstruction'),
      S.root.findFirst('trackerOrigin'),
      S.root.findFirst('planeTracker0'),
      S.root.findFirst('sizeUI'),
      S.root.findFirst('Camera')
    ]).then(p=>{
      this.trackerInstruction = p[0];
      this.origin = p[1];
      this.planeTracker = p[2];
      this.sizeUI = p[3];
      this.camera = p[4];
      this.initAfterPromiseResolved();
    }).catch(e=>{
      if (ENABLE_LOGGING){
        D.log(e.stack);
      }
    });
  }

  initAfterPromiseResolved(){
    this.subscribeCameraPosition();
    this.subscribeTracker();
  }

  // Check if Real-World Scale is supported and call proper methods
  subscribeTracker(){
    T.setTimeoutWithSnapshot({
      realScaleSupported: PT.realScaleSupported
    }, (t, s)=>{
      if (s.realScaleSupported){
        if (ENABLE_LOGGING){
          D.log('[TrackerInstruction] Real world scale is SUPPORTED');
        }
        this.subscribeRWS();
        this.setScale(this.origin, RWS_SCALE_ADJUSTMENT);
        this.sizeUI.hidden = R.val(false);
      } else {
        if (ENABLE_LOGGING){
          D.log('[TrackerInstruction] Real world scale is NOT available on this device');
        }
        this.subscribeNonRWS(deviceElevation=>{
          let scaleAdjustment =
            DEVICE_ELEVATION_EXPECTATION_FOR_NON_REAL_SCALE / deviceElevation;
          if (ENABLE_LOGGING){
            D.log('[TrackerInstruction] Adjust scale to '+scaleAdjustment);
          }
          this.setScale(this.origin, scaleAdjustment);
        });
        this.sizeUI.hidden = R.val(true);
      }
    }, WAIT_FOR_NEXT_FRAME);
  }

  // Show proper instruction based on camera position (front/back)
  subscribeCameraPosition(){
    CI.captureDevicePosition.monitor({fireOnInitialValue:true}).subscribe(e=>{
      if (e.newValue=='BACK'){
        I.bind(R.val(true), 'find_a_surface');
        this.trackerInstruction.hidden = R.val(false);
      } else {
        I.bind(R.val(true), 'flip_the_camera');
        this.trackerInstruction.hidden = R.val(true);
      }
    });
  }

  // If Real-World Scale is supported, subscribe tracking callbacks
  subscribeRWS(){
    PT.realScaleActive.monitor({fireOnInitialValue:true}).subscribe(e=>{
      if (e.newValue) {
        if (ENABLE_LOGGING){
          D.log('[TrackerInstruction] Real world scale is READY');
        }
        this.onTrackingReady();
      } else {
        if (ENABLE_LOGGING){
          D.log('[TrackerInstruction] Real world scale is NOT READY');
        }
        this.onTrackingNotReady();
      }
    });
  }

  // If Real-World Scale is NOT supported, apply fallback logic and subscribe tracking callbacks
  subscribeNonRWS(callback){
    this.planeTracker.confidence.monitor({fireOnInitialValue:true}).subscribe(e=>{
      if (e.newValue=='MEDIUM' || e.newValue=='HIGH') {
        if (ENABLE_LOGGING){
          D.log('[TrackerInstruction] Tracking confidence is MID~HIGH');
        }
        this.onTrackingReady();
        let baseHeight = this.getCameraHeightInPlaneTrackerSpace();
        T.setTimeout(t=>{
          if (ENABLE_LOGGING){
          D.log('[TrackerInstruction] BaseHeight: '+baseHeight.pinLastValue());
          }
          callback(baseHeight.pinLastValue());
        }, DELAY_TO_WORKAROUND_CRASH);
      } else {
        if (ENABLE_LOGGING){
          D.log('[TrackerInstruction] Tracking confidence too low');
        }
        this.onTrackingNotReady();
        callback(0);
      }
    });
  }

  // Tracking ready callback
  onTrackingReady(){
    this.trackerInstruction.inputs.setBoolean('hidden', R.val(true));
    this.origin.hidden = R.val(false);
    placement.setActive(true);
  }

  // Tracking NOT ready callback
  onTrackingNotReady(){
    this.origin.hidden = R.val(true);
    this.trackerInstruction.inputs.setBoolean('hidden', R.val(false));
    if (CI.captureDevicePosition.pinLastValue()=='BACK') {
      I.bind(R.val(true), 'find_a_surface');
    }
    placement.setActive(false);
    manipulation.setActive(false);
  }

  // Helper method to set all 3 components of a vector
  setScale(sceneObject, size){
    sceneObject.transform.scaleX = size;
    sceneObject.transform.scaleY = size;
    sceneObject.transform.scaleZ = size;
  }

  // Calculate the distance between device and ground. Assuming users are holding the device while standing or sitting, this value should be around 3~4 feet.
  getCameraHeightInPlaneTrackerSpace(){
    let cameraPos = this.planeTracker.worldTransform.inverse()
      .applyToPoint(this.camera.worldTransform.position);
    return cameraPos.y;
  }
}

export const trackerInstruction = new TrackerInstruction();
