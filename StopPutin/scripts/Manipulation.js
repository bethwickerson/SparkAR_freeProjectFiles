/**
 * (c) Facebook, Inc. and its affiliates. Confidential and proprietary.
 */
// @ts-nocheck

const S = require('Scene');
const R = require('Reactive');
const T = require('Time');
const I = require('Instruction');
const TG = require('TouchGestures');
export const D = require('Diagnostics');

const ENABLE_LOGGING = false;
const DEFAULT_ACTIVATION = false;
const ROTATION_GESTURE_SENSITIVITY = 2;
const PAN_SMOOTHING = 100;
const TAP_SMOOTHING = 100;
const ALLOW_SCREEN_TAP = true;
const WAIT_FOR_NEXT_FRAME = 1;
const YIELD_TO_ROTATE_AND_PITCH = 70;
const YIELD_TO_ROTATE = 30;
const ANCHOR_TRANSITION_DURATION = 400;
const MIN_SCALE = .05;
const MAX_SCALE = 3;

// This class implement the object manipulation logics (drag, rotate, scale)
export class Manipulation {
  static get STATES() {
    return {
      NONE: 0, TAP: 1, MOVING: 2, ROTATING: 3, SCALING: 4
    };
  }

  constructor(){
    this.state = Manipulation.STATES.NONE;
    Promise.all([
      S.root.findFirst('planeTracker0'),
      S.root.findFirst('Camera'),
      S.root.findFirst('manipulationReticle'),
      S.root.findFirst('trackerOrigin'),
      S.root.findFirst('sizeUI'),
    ]).then(p=>{
      this.planeTracker = p[0];
      this.camera = p[1];
      this.anchor = p[2];
      this.origin = p[3];
      this.sizeUI = p[4];
      this.setActive(DEFAULT_ACTIVATION);
    }).catch(e=>{
      if (ENABLE_LOGGING){
        D.log(e.stack);
      }
    });
  }

  // Set the class active/inactive and subscribe/unsubscribe touch gestures
  setActive(isActive) {
    this.state = Manipulation.STATES.NONE;
    if (isActive) {
      this.unsubscribeTouchGestures();
      this.subscribeTouchGestures();
      this.anchor.inputs.setScalar('Scale', 1);
      this.isActive = true;
      I.bind(R.val(false), '');
    } else {
      this.anchor.inputs.setBoolean('Active', false);
      this.unsubscribeTouchGestures();
      this.resetScale();
      this.syncWorldPositionSmoothed(this.anchor, this.planeTracker, 0);
      this.isActive = false;
    }
  }

  subscribeTouchGestures() {
    this.anchorPanSubscription = this.subscribeAnchorPan(this.anchor);
    this.rotateSubscription = this.subscribeRotate();
    this.pinchSubscription = this.subscribePinch();
    this.screenTapSubscription = this.subscribeScreenTap();
  }

  unsubscribeTouchGestures() {
    if (this.screenTapSubscription != null) {
      this.screenTapSubscription.unsubscribe();
    }
    if (this.anchorPanSubscription != null) {
      this.anchorPanSubscription.unsubscribe();
    }
    if (this.pinchSubscription != null) {
      this.pinchSubscription.unsubscribe();
    }
    if (this.rotateSubscription != null) {
      this.rotateSubscription.unsubscribe();
    }
  }

  // Move the object immediately when tapping on screen
  subscribeScreenTap() {
    if (!ALLOW_SCREEN_TAP) {
      return null;
    }
    return TG.onTap().subscribe(gesture=>{
      this.planeTracker.trackPoint(gesture.location);
      T.setTimeout(t=>{
        this.syncWorldPositionSmoothed(
          this.anchor, this.planeTracker, TAP_SMOOTHING);
        this.anchor.inputs.setBoolean('Active', true);
        this.state = Manipulation.STATES.TAP;
      }, WAIT_FOR_NEXT_FRAME);
      T.setTimeout(t=>{
        this.anchor.inputs.setBoolean('Active', false);
        this.state = Manipulation.STATES.NONE
      }, ANCHOR_TRANSITION_DURATION);
    });
  }

  // Pan to translate the object.
  subscribeAnchorPan(anchor) {
    return TG.onPan(anchor).subscribe(gesture=>{
      T.setTimeout(t=>{
        if (this.state != Manipulation.STATES.NONE) {
          return;
        }
        this.state = Manipulation.STATES.MOVING;
        this.anchor.inputs.setBoolean('Active', true);
        this.planeTracker.trackPoint(gesture.location, gesture.state);
        this.syncWorldPositionSmoothed(
          this.anchor, this.planeTracker, PAN_SMOOTHING);

        gesture.state.eq('ENDED').monitor().subscribe(() => {
          this.anchor.inputs.setBoolean('Active', false);
          this.state = Manipulation.STATES.NONE;
        });
      }, YIELD_TO_ROTATE_AND_PITCH);
    });
  }

  // Pinch to scale the object
  subscribePinch() {
    return TG.onPinch().subscribeWithSnapshot({
      scale: this.anchor.transform.scaleX
    }, (gesture, snapshot)=>{
      T.setTimeout(t=>{
        if (this.state != Manipulation.STATES.NONE) {
          return;
        }
        let newScale = gesture.scale.mul(snapshot.scale);
        this.setScale(this.anchor, newScale.clamp(MIN_SCALE, MAX_SCALE));
        this.state = Manipulation.STATES.SCALING;
        this.anchor.inputs.setBoolean('Active', true);
        this.anchor.inputs.setScalar('Scale', newScale.clamp(MIN_SCALE, MAX_SCALE));
        this.sizeUI.inputs.setBoolean('Active', true);
        let percentage = newScale.clamp(MIN_SCALE, MAX_SCALE).mul(100).floor().format('{:.0f}%');
        this.sizeUI.inputs.setString('Label', percentage);

        gesture.state.eq('ENDED').monitor().subscribe((state) => {
          this.state = Manipulation.STATES.NONE;
          this.anchor.inputs.setBoolean('Active', false);
          this.sizeUI.inputs.setBoolean('Active', false);
        });
      }, YIELD_TO_ROTATE);
    });
  }

  // Reset object scale
  resetScale(){
    let newScale = R.val(1);
    this.setScale(this.anchor, newScale);
    this.anchor.inputs.setScalar('Scale', newScale);
  }

  // Rotate the object
  subscribeRotate() {
    return TG.onRotate().subscribeWithSnapshot({
      rotate: this.anchor.transform.rotationY
    }, (gesture, snapshot)=>{
     if (this.state != Manipulation.STATES.NONE) {
       return;
     }
     let delta = gesture.rotation.mul(-1).mul(ROTATION_GESTURE_SENSITIVITY);
     this.anchor.transform.rotationY = delta.add(snapshot.rotate)
     this.anchor.inputs.setBoolean('Active', true);
     this.state = Manipulation.STATES.ROTATING;

     gesture.state.eq('ENDED').monitor().subscribe((state) => {
       this.anchor.inputs.setBoolean('Active', false);
       this.state = Manipulation.STATES.NONE;
     });
    });
  }

  syncWorldPositionSmoothed(a, b, smoothing) {
    a.worldTransform.position = b.worldTransform.position.expSmooth(smoothing);
  }

  // Helper method to set all three components of a vector
  setScale(sceneObject, size){
    sceneObject.transform.scaleX = size;
    sceneObject.transform.scaleY = size;
    sceneObject.transform.scaleZ = size;
  }
}

export const manipulation = new Manipulation();
