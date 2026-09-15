/** 자식 요소를 뷰포트 중앙에 스크롤한다 */
export function scrollChildIntoView(
  root: HTMLElement | null,
  target: HTMLElement | null,
  axis: "x" | "y",
  behavior: ScrollBehavior = "auto",
) {
  if (!root || !target) return;

  const rootRect = root.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  if (axis === "x") {
    const left =
      root.scrollLeft +
      (targetRect.left -
        rootRect.left -
        root.clientWidth / 2 +
        targetRect.width / 2);
    root.scrollTo({ left, behavior });
    return;
  }

  const top =
    root.scrollTop +
    (targetRect.top -
      rootRect.top -
      root.clientHeight / 2 +
      targetRect.height / 2);
  root.scrollTo({ top, behavior });
}
