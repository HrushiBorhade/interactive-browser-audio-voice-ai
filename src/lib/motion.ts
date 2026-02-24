/* iOS-native curve from Vaul (Emil Kowalski) */
export const iosEase = [0.32, 0.72, 0, 1] as const;

export const fadeIn = {
  initial: { opacity: 0, y: 8 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.5, ease: iosEase },
};
