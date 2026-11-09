/**
 * Plays a one-shot animation class on an element, restarting it if it is already
 * running, and removes the class when it ends.
 */
export function playOnce(element, className) {
  if (!element) return;
  element.classList.remove(className);
  // Reading layout restarts the CSS animation.
  void element.offsetWidth;
  element.classList.add(className);
  const done = (event) => {
    if (event.target !== element && !element.contains(event.target)) return;
    element.classList.remove(className);
    element.removeEventListener('animationend', done);
  };
  element.addEventListener('animationend', done);
}
