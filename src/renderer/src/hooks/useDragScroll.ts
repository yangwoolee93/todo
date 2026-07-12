import { useRef, type MouseEvent } from "react";

/**
 * 마우스 드래그로 가로 스크롤하는 컨테이너용 훅
 * - scrollRef를 overflow-x-auto 요소에, dragHandlers를 같은 요소에 스프레드
 */
export function useDragScroll<T extends HTMLElement>() {
  const scrollRef = useRef<T>(null);
  const dragState = useRef({ isDragging: false, startX: 0, scrollLeft: 0 });

  const handleMouseDown = (event: MouseEvent<T>) => {
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = {
      isDragging: true,
      startX: event.pageX - el.offsetLeft,
      scrollLeft: el.scrollLeft,
    };
  };

  const handleMouseMove = (event: MouseEvent<T>) => {
    const el = scrollRef.current;
    if (!el || !dragState.current.isDragging) return;
    const x = event.pageX - el.offsetLeft;
    el.scrollLeft = dragState.current.scrollLeft - (x - dragState.current.startX);
  };

  const handleMouseUp = () => {
    dragState.current.isDragging = false;
  };

  return {
    scrollRef,
    dragHandlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseUp,
    },
  };
}
