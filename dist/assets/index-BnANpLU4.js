import{c as _,r as l}from"./index-CQAG8VK0.js";/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ae=_("BookOpen",[["path",{d:"M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z",key:"vv98re"}],["path",{d:"M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",key:"1cyq3y"}]]);/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oe=_("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);var m=function(){return m=Object.assign||function(n){for(var t,r=1,a=arguments.length;r<a;r++){t=arguments[r];for(var o in t)Object.prototype.hasOwnProperty.call(t,o)&&(n[o]=t[o])}return n},m.apply(this,arguments)};function B(e,n){var t={};for(var r in e)Object.prototype.hasOwnProperty.call(e,r)&&n.indexOf(r)<0&&(t[r]=e[r]);if(e!=null&&typeof Object.getOwnPropertySymbols=="function")for(var a=0,r=Object.getOwnPropertySymbols(e);a<r.length;a++)n.indexOf(r[a])<0&&Object.prototype.propertyIsEnumerable.call(e,r[a])&&(t[r[a]]=e[r[a]]);return t}function ie(e,n,t){if(t||arguments.length===2)for(var r=0,a=n.length,o;r<a;r++)(o||!(r in n))&&(o||(o=Array.prototype.slice.call(n,0,r)),o[r]=n[r]);return e.concat(o||Array.prototype.slice.call(n))}var w="right-scroll-bar-position",S="width-before-scroll-bar",z="with-scroll-bars-hidden",N="--removed-body-scroll-bar-size";function E(e,n){return typeof e=="function"?e(n):e&&(e.current=n),e}function P(e,n){var t=l.useState(function(){return{value:e,callback:n,facade:{get current(){return t.value},set current(r){var a=t.value;a!==r&&(t.value=r,t.callback(r,a))}}}})[0];return t.callback=n,t.facade}var T=typeof window<"u"?l.useLayoutEffect:l.useEffect,M=new WeakMap;function ce(e,n){var t=P(null,function(r){return e.forEach(function(a){return E(a,r)})});return T(function(){var r=M.get(t);if(r){var a=new Set(r),o=new Set(e),c=t.current;a.forEach(function(i){o.has(i)||E(i,null)}),o.forEach(function(i){a.has(i)||E(i,c)})}M.set(t,e)},[e]),t}function L(e){return e}function q(e,n){n===void 0&&(n=L);var t=[],r=!1,a={read:function(){if(r)throw new Error("Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.");return t.length?t[t.length-1]:e},useMedium:function(o){var c=n(o,r);return t.push(c),function(){t=t.filter(function(i){return i!==c})}},assignSyncMedium:function(o){for(r=!0;t.length;){var c=t;t=[],c.forEach(o)}t={push:function(i){return o(i)},filter:function(){return t}}},assignMedium:function(o){r=!0;var c=[];if(t.length){var i=t;t=[],i.forEach(o),c=t}var b=function(){var s=c;c=[],s.forEach(o)},p=function(){return Promise.resolve().then(b)};p(),t={push:function(s){c.push(s),p()},filter:function(s){return c=c.filter(s),t}}}};return a}function ue(e){e===void 0&&(e={});var n=q(null);return n.options=m({async:!0,ssr:!1},e),n}var j=function(e){var n=e.sideCar,t=B(e,["sideCar"]);if(!n)throw new Error("Sidecar: please provide `sideCar` property to import the right car");var r=n.read();if(!r)throw new Error("Sidecar medium not found");return l.createElement(r,m({},t))};j.isSideCarExport=!0;function fe(e,n){return e.useMedium(n),j}var V=function(){if(typeof __webpack_nonce__<"u")return __webpack_nonce__};function D(){if(!document)return null;var e=document.createElement("style");e.type="text/css";var n=V();return n&&e.setAttribute("nonce",n),e}function G(e,n){e.styleSheet?e.styleSheet.cssText=n:e.appendChild(document.createTextNode(n))}function H(e){var n=document.head||document.getElementsByTagName("head")[0];n.appendChild(e)}var Q=function(){var e=0,n=null;return{add:function(t){e==0&&(n=D())&&(G(n,t),H(n)),e++},remove:function(){e--,!e&&n&&(n.parentNode&&n.parentNode.removeChild(n),n=null)}}},F=function(){var e=Q();return function(n,t){l.useEffect(function(){return e.add(n),function(){e.remove()}},[n&&t])}},K=function(){var e=F(),n=function(t){var r=t.styles,a=t.dynamic;return e(r,a),null};return n},U={left:0,top:0,right:0,gap:0},A=function(e){return parseInt(e||"",10)||0},J=function(e){var n=window.getComputedStyle(document.body),t=n[e==="padding"?"paddingLeft":"marginLeft"],r=n[e==="padding"?"paddingTop":"marginTop"],a=n[e==="padding"?"paddingRight":"marginRight"];return[A(t),A(r),A(a)]},X=function(e){if(e===void 0&&(e="margin"),typeof window>"u")return U;var n=J(e),t=document.documentElement.clientWidth,r=window.innerWidth;return{left:n[0],top:n[1],right:n[2],gap:Math.max(0,r-t+n[2]-n[0])}},Y=K(),v="data-scroll-locked",Z=function(e,n,t,r){var a=e.left,o=e.top,c=e.right,i=e.gap;return t===void 0&&(t="margin"),`
  .`.concat(z,` {
   overflow: hidden `).concat(r,`;
   padding-right: `).concat(i,"px ").concat(r,`;
  }
  body[`).concat(v,`] {
    overflow: hidden `).concat(r,`;
    overscroll-behavior: contain;
    `).concat([n&&"position: relative ".concat(r,";"),t==="margin"&&`
    padding-left: `.concat(a,`px;
    padding-top: `).concat(o,`px;
    padding-right: `).concat(c,`px;
    margin-left:0;
    margin-top:0;
    margin-right: `).concat(i,"px ").concat(r,`;
    `),t==="padding"&&"padding-right: ".concat(i,"px ").concat(r,";")].filter(Boolean).join(""),`
  }
  
  .`).concat(w,` {
    right: `).concat(i,"px ").concat(r,`;
  }
  
  .`).concat(S,` {
    margin-right: `).concat(i,"px ").concat(r,`;
  }
  
  .`).concat(w," .").concat(w,` {
    right: 0 `).concat(r,`;
  }
  
  .`).concat(S," .").concat(S,` {
    margin-right: 0 `).concat(r,`;
  }
  
  body[`).concat(v,`] {
    `).concat(N,": ").concat(i,`px;
  }
`)},W=function(){var e=parseInt(document.body.getAttribute(v)||"0",10);return isFinite(e)?e:0},$=function(){l.useEffect(function(){return document.body.setAttribute(v,(W()+1).toString()),function(){var e=W()-1;e<=0?document.body.removeAttribute(v):document.body.setAttribute(v,e.toString())}},[])},se=function(e){var n=e.noRelative,t=e.noImportant,r=e.gapMode,a=r===void 0?"margin":r;$();var o=l.useMemo(function(){return X(a)},[a]);return l.createElement(Y,{styles:Z(o,!n,a,t?"":"!important")})},ee=function(e){if(typeof document>"u")return null;var n=Array.isArray(e)?e[0]:e;return n.ownerDocument.body},d=new WeakMap,g=new WeakMap,y={},k=0,I=function(e){return e&&(e.host||I(e.parentNode))},te=function(e,n){return n.map(function(t){if(e.contains(t))return t;var r=I(t);return r&&e.contains(r)?r:(console.error("aria-hidden",t,"in not contained inside",e,". Doing nothing"),null)}).filter(function(t){return!!t})},ne=function(e,n,t,r){var a=te(n,Array.isArray(e)?e:[e]);y[t]||(y[t]=new WeakMap);var o=y[t],c=[],i=new Set,b=new Set(a),p=function(u){!u||i.has(u)||(i.add(u),p(u.parentNode))};a.forEach(p);var s=function(u){!u||b.has(u)||Array.prototype.forEach.call(u.children,function(f){if(i.has(f))s(f);else try{var h=f.getAttribute(r),x=h!==null&&h!=="false",C=(d.get(f)||0)+1,O=(o.get(f)||0)+1;d.set(f,C),o.set(f,O),c.push(f),C===1&&x&&g.set(f,!0),O===1&&f.setAttribute(t,"true"),x||f.setAttribute(r,"true")}catch(R){console.error("aria-hidden: cannot operate on ",f,R)}})};return s(n),i.clear(),k++,function(){c.forEach(function(u){var f=d.get(u)-1,h=o.get(u)-1;d.set(u,f),o.set(u,h),f||(g.has(u)||u.removeAttribute(r),g.delete(u)),h||u.removeAttribute(t)}),k--,k||(d=new WeakMap,d=new WeakMap,g=new WeakMap,y={})}},le=function(e,n,t){t===void 0&&(t="data-aria-hidden");var r=Array.from(Array.isArray(e)?e:[e]),a=ee(e);return a?(r.push.apply(r,Array.from(a.querySelectorAll("[aria-live]"))),ne(r,a,t,"aria-hidden")):function(){return null}};export{ae as B,se as R,oe as S,B as _,m as a,ie as b,ue as c,fe as e,S as f,le as h,K as s,ce as u,w as z};
