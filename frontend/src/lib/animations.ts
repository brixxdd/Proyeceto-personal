import type { Variants } from "framer-motion";

export const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
} as const;

export const bouncyTransition = {
  type: "spring",
  stiffness: 500,
  damping: 25,
} as const;

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

export const slideUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: springTransition },
  exit: { opacity: 0, y: 20, transition: { duration: 0.2 } }
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};
