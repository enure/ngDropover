/* global angular */
(function(window, document) {
    'use strict';

    /*
     * AngularJS ngDropover
     * Version: 0.0.0
     *
     * Copyright 2015
     * All Rights Reserved.
     * Use, reproduction, distribution, and modification of this code is subject to the terms and
     * conditions of the MIT license, available at http://www.opensource.org/licenses/mit-license.php
     *
     * Authors: Tony Smith & Ricky Sandoval
     * 
     */

    angular.module('ngDropover', [])
        .run(function($document, $rootScope) {
            $document.on('click', function(event) {
                event.fromDocument = true;
                $rootScope.$emit("ngDropover.closeAll", event);
            });
        })
        .constant(
            'ngDropoverConfig', {
                'offsetX': 0,
                'offsetY': 0,
                'wrapperClass': '',
                'closeOthersOnOpen': false,
                'trigger': "",
                'triggerEvent': "click",
                'position': "bottom",
                'closeOnClickOff': true
            }
        )
        .factory('triggerHelper', function() {

            var triggerMap = {
                'mouseenter': 'mouseleave',
                'click': 'click',
                'focus': 'blur'
            };

            return {
                getTriggers: function(trigger) {
                    var show = trigger;
                    var hide = triggerMap[show] || show;
                    if (trigger == 'hover') {
                        return {
                            show: 'mouseenter',
                            hide: 'mouseleave'
                        };
                    }
                    return {
                        show: show,
                        hide: hide
                    };
                }
            };
        })
        .directive('ngDropover', function(ngDropoverConfig, $compile, $rootScope, $interval, $position, $document, $window, triggerHelper) {
            return {
                restrict: 'A',
                replace: true,
                scope: {
                    target: '@ngDropover',
                    ngDropoverOptions: '@ngDropoverOptions'
                },
                link: function(scope, elm, attrs) {

                    var dropoverContents, wrapper, triggerElement;

                    scope.$watch('ngDropoverOptions', function() {
                        console.log("WATCH");
                        scope.config = angular.extend({}, ngDropoverConfig, scope.$eval(scope.ngDropoverOptions));
                        setHtml();
                        setTrigger();
                    }, true);

                    //ToDo: Check if ngDropoverOptions is an object. If not, check the scope for a model with that name


                    //Get the trigger from the config if the user set it. Otherwise the trigger will default to the scope's element
                    //ToDo: should this be a querySelectorAll?
                    //ToDo: add a way to have no trigger on the element

                    function setTrigger() {
                        triggerElement = elm;
                        if (scope.config.trigger != "") {
                            triggerElement = angular.element(document.querySelector(scope.config.trigger));
                        }
                        triggerElement.addClass('ng-dropover-trigger');


                        //If the the trigger's event to open matches the event to close, then send to the toggle method
                        //else send to individual open and close methods
                        var triggerObj = triggerHelper.getTriggers(scope.config.triggerEvent);
                        if (triggerObj.show === triggerObj.hide) {
                            triggerElement.on(triggerObj.show, function(e) {
                                if (!e.ngDropoverId) {
                                    e.ngDropoverId = scope.ngDropoverId;
                                    scope.toggle(scope.ngDropoverId);
                                }
                            });
                        } else {
                            triggerElement.on(triggerObj.show, function(e) {
                                e.ngDropoverId = scope.ngDropoverId;
                                if (!scope.isOpen) {
                                    scope.open(scope.ngDropoverId);
                                }
                            });

                            triggerElement.on(triggerObj.hide, function(e) {
                                e.ngDropoverId = scope.ngDropoverId;
                                if (scope.isOpen) {
                                    scope.close(scope.ngDropoverId);
                                }
                            });

                            triggerElement.on('click', function(e) {
                                e.ngDropoverId = scope.ngDropoverId
                            });
                        }
                    }


                    // TODO: set display of wrapper conditionally based on context
                    // note: some display values of the directive element may be problematic to assign to, such as list-item,
                    // none, initial, inherit.. more?
                    // Maybe check out what getStyle can do for us here. Consider moving to body again.
                    function setHtml() {

                        //console.log(getStyle(elm[0], 'position'));

                        elm.css('position', 'relative');

                        dropoverContents = getDropoverContents();
                        elm.append(dropoverContents);
                        dropoverContents.css({
                            'position': 'absolute',
                            'visibility': 'hidden'
                        }).addClass('ng-dropover-contents');
                        positionContents();

                        dropoverContents.on('click', function(event) {
                            event.ngDropoverId = scope.ngDropoverId;
                        });
                    }

                    function getStyle(el, cssprop) {
                        if (el.currentStyle) { //IE
                            return el.currentStyle[cssprop];
                        } else if ($window.getComputedStyle) {
                            return $window.getComputedStyle(el)[cssprop];
                        }
                        // finally try and get inline style
                        return el.style[cssprop];
                    }

                    function positionContents() {
                        var positions = $position.positionElements(elm, dropoverContents, scope.config.position, false);
                        var offX = parseInt(scope.config.offsetX, 10) || 0;
                        var offY = parseInt(scope.config.offsetY, 10) || 0;
                        dropoverContents.css('left', positions.left + offX + 'px');
                        dropoverContents.css('top', positions.top + offY + 'px');
                    }

                    function getDropoverContents() {
                        var ret;
                        if (elm[0].querySelector('[ng-dropover-contents]')) {
                            ret = angular.element(elm[0].querySelector('[ng-dropover-contents]'));
                            elm[0].querySelector('[ng-dropover-contents]').remove();
                            return ret;
                        } else {
                            return angular.element("<div class='ng-dropover-empty'>Oops, you forgot to specify what goes in the dropdown</div>");
                        }
                    }

                    scope.open = function(ngDropoverId) {
                        if (ngDropoverId == scope.ngDropoverId && !scope.isOpen) {

                            //start the display process and fire events
                            dropoverContents.css('visibility', 'visible');
                            $rootScope.$broadcast('ngDropover.opening', scope.ngDropoverId);
                            $rootScope.$broadcast('ngDropover.opened', scope.ngDropoverId);
                            elm.addClass('ng-dropover-open');
                            $rootScope.$broadcast('ngDropover.rendered', scope.ngDropoverId);

                            positionContents();

                            scope.isOpen = true;
                        }
                    };

                    scope.close = function(ngDropoverId) {
                        if (ngDropoverId == scope.ngDropoverId && scope.isOpen) {
                            closer();
                        }
                    };

                    scope.toggle = function(ngDropoverId) {
                        if (!scope.isOpen) {
                            scope.open(ngDropoverId);
                        } else {
                            scope.close(ngDropoverId);
                        }
                    };

                    scope.closeAll = function() {
                        if (scope.isOpen) {
                            closer();
                        }
                    };

                    function closer() {
                        dropoverContents.css('visibility', 'hidden');
                        $rootScope.$broadcast('ngDropover.closing', scope.ngDropoverId);
                        $rootScope.$broadcast('ngDropover.closed', scope.ngDropoverId);
                        elm.removeClass('ng-dropover-open');
                        scope.isOpen = false;
                    };


                },
                controller: [
                    '$scope', '$element', '$attrs',
                    function($scope, $element, $attrs) {

                        $scope.isOpen = false;
                        $scope.ngDropoverId = $scope.target || $scope.$id;

                        //set up event listeners
                        $scope.openListener = $rootScope.$on('ngDropover.open', function(event, m) {
                            $scope.open(m.ngDropoverId);
                        });

                        $scope.closeListener = $rootScope.$on('ngDropover.close', function(event, m) {
                            $scope.close(m.ngDropoverId);
                        });

                        $scope.closeAllListener = $rootScope.$on('ngDropover.closeAll', function(event, m) {
                            if (m.ngDropoverId === $scope.ngDropoverId) {
                                if (m.closeParentDropover) {
                                    $scope.closeAll();
                                }
                            } else {
                                if ($scope.config.closeOnClickOff) {
                                    $scope.closeAll();
                                }
                            }
                        });

                        $scope.openListener = $rootScope.$on('ngDropover.toggle', function(event, m) {
                            console.log('toggle', $scope.isOpen);

                            $scope.isOpen ? $scope.close(m.ngDropoverId) : $scope.open(m.ngDropoverId);
                        });

                        $scope.$on('$destroy', function() {
                            $scope.openListener();
                            $scope.openListener = null;
                            $scope.closeListener();
                            $scope.closeListener = null;
                            $scope.closeAllListener();
                            $scope.closeAllListener = null;
                            $scope.toggleListener();
                            scope.toggleListener = null;
                        });
                    }
                ]
            };
        }).directive('ngDropoverTrigger', function($rootScope, $document, triggerHelper) {
            return {
                restrict: 'AE',
                link: function(scope, element, attrs) {
                    var options = scope.$eval(attrs.ngDropoverTrigger);
                    var triggerObj = triggerHelper.getTriggers(options.triggerEvent || 'click');
                    element.addClass('ng-dropover-trigger');

                    if (options.action == "open" || options.action == "close") {
                        element.on(triggerObj.show, function(event) {
                            event.ngDropoverId = options.ngDropoverId;
                            scope.$emit('ngDropover.' + options.action, event);
                        });
                    } else {
                        if (triggerObj.show === triggerObj.hide) {
                            element.on(triggerObj.show, function(event) {
                                event.ngDropoverId = options.ngDropoverId;
                                scope.$emit('ngDropover.toggle', event);
                            });
                        } else {
                            element.on(triggerObj.show, function(event) {
                                event.ngDropoverId = options.ngDropoverId;
                                scope.$emit('ngDropover.open', event);
                            });

                            element.on(triggerObj.hide, function(event) {
                                event.ngDropoverId = options.ngDropoverId;
                                scope.$emit('ngDropover.close', event);
                            });
                        }
                    }
                    element.on('click', function(event) {
                        event.ngDropoverId = options.ngDropoverId;
                    });
                }
            };

        }).factory('$position', ['$document', '$window', function($document, $window) {

            function getStyle(el, cssprop) {
                if (el.currentStyle) { //IE
                    return el.currentStyle[cssprop];
                } else if ($window.getComputedStyle) {
                    return $window.getComputedStyle(el)[cssprop];
                }
                // finally try and get inline style
                return el.style[cssprop];
            }

            /**
             * Checks if a given element is statically positioned
             * @param element - raw DOM element
             */
            function isStaticPositioned(element) {
                return (getStyle(element, 'position') || 'static') === 'static';
            }

            /**
             * returns the closest, non-statically positioned parentOffset of a given element
             * @param element
             */
            var parentOffsetEl = function(element) {
                var docDomEl = $document[0];
                var offsetParent = element.offsetParent || docDomEl;
                while (offsetParent && offsetParent !== docDomEl && isStaticPositioned(offsetParent)) {
                    offsetParent = offsetParent.offsetParent;
                }
                return offsetParent || docDomEl;
            };

            return {
                /**
                 * Provides read-only equivalent of jQuery's position function:
                 * http://api.jquery.com/position/
                 */
                position: function(element) {
                    var elBCR = this.offset(element);
                    var offsetParentBCR = {
                        top: 0,
                        left: 0
                    };
                    var offsetParentEl = parentOffsetEl(element[0]);
                    if (offsetParentEl != $document[0]) {
                        offsetParentBCR = this.offset(angular.element(offsetParentEl));
                        offsetParentBCR.top += offsetParentEl.clientTop - offsetParentEl.scrollTop;
                        offsetParentBCR.left += offsetParentEl.clientLeft - offsetParentEl.scrollLeft;
                    }

                    var boundingClientRect = element[0].getBoundingClientRect();
                    return {
                        width: boundingClientRect.width || element.prop('offsetWidth'),
                        height: boundingClientRect.height || element.prop('offsetHeight'),
                        top: elBCR.top - offsetParentBCR.top,
                        left: elBCR.left - offsetParentBCR.left
                    };
                },

                /**
                 * Provides read-only equivalent of jQuery's offset function:
                 * http://api.jquery.com/offset/
                 */
                offset: function(element) {
                    var boundingClientRect = element[0].getBoundingClientRect();
                    return {
                        width: boundingClientRect.width || element.prop('offsetWidth'),
                        height: boundingClientRect.height || element.prop('offsetHeight'),
                        top: boundingClientRect.top + ($window.pageYOffset || $document[0].documentElement.scrollTop),
                        left: boundingClientRect.left + ($window.pageXOffset || $document[0].documentElement.scrollLeft)
                    };
                },

                /**
                 * Provides coordinates for the targetEl in relation to hostEl
                 */
                positionElements: function(hostEl, targetEl, positionStr, appendToBody) {

                    var positionStrParts = positionStr.split('-');
                    var pos0 = positionStrParts[0],
                        pos1 = positionStrParts[1] || 'center';

                    var hostElPos,
                        targetElWidth,
                        targetElHeight,
                        targetElPos;

                    hostElPos = appendToBody ? this.offset(hostEl) : this.position(hostEl);

                    targetElWidth = targetEl.prop('offsetWidth');
                    targetElHeight = targetEl.prop('offsetHeight');

                    var shiftWidth = {
                        center: function() {
                            return hostElPos.left + hostElPos.width / 2 - targetElWidth / 2;
                        },
                        left: function() {
                            return hostElPos.left;
                        },
                        right: function() {
                            return hostElPos.left + hostElPos.width;
                        }
                    };

                    var shiftHeight = {
                        center: function() {
                            return hostElPos.top + hostElPos.height / 2 - targetElHeight / 2;
                        },
                        top: function() {
                            return hostElPos.top;
                        },
                        bottom: function() {
                            return hostElPos.top + hostElPos.height;
                        }
                    };

                    switch (pos0) {
                        case 'right':
                            targetElPos = {
                                top: shiftHeight[pos1](),
                                left: shiftWidth[pos0]()
                            };
                            break;
                        case 'left':
                            targetElPos = {
                                top: shiftHeight[pos1](),
                                left: hostElPos.left - targetElWidth
                            };
                            break;
                        case 'bottom':
                            targetElPos = {
                                top: shiftHeight[pos0](),
                                left: shiftWidth[pos1]()
                            };
                            break;
                        default:
                            targetElPos = {
                                top: hostElPos.top - targetElHeight,
                                left: shiftWidth[pos1]()
                            };
                            break;
                    }

                    return targetElPos;
                }
            };
        }]);
})(window, document);