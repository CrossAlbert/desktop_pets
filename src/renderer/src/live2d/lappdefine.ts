/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { LogLevel } from '@framework/live2dcubismframework';


/**
 * 画面默认缩放比
 */ 
export const ViewScale = 1.0;
/**
 * 画面最大缩放比
 */ 
export const ViewMaxScale = 2.0;
/**
 * 画面最小缩放比
 */ 
export const ViewMinScale = 1.0;

export const ViewLogicalLeft = -1.0;
export const ViewLogicalRight = 1.0;
export const ViewLogicalBottom = -1.0;
export const ViewLogicalTop = 1.0;

export const ViewLogicalMaxLeft = -2.0;
export const ViewLogicalMaxRight = 2.0;
export const ViewLogicalMaxBottom = -2.0;
export const ViewLogicalMaxTop = 2.0;

// 运动优先级常数
export const PriorityNone = 0;
export const PriorityIdle = 1;
export const PriorityNormal = 2;
export const PriorityForce = 3;

//MOC3一致性验证选项
export const MOCConsistencyValidationEnable = true;

// 调试日志显示选项
export const DebugLogEnable = true;
export const DebugTouchLogEnable = false;

// Frameworkから出力するログのレベル設定
// 从框架输出的日志级别设置
export const CubismLoggingLevel: LogLevel = LogLevel.LogLevel_Verbose;


