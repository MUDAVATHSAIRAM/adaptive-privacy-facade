import { motion } from "framer-motion";

// iOS-style spring fade-up when a block scrolls into view. MotionConfig in App.jsx
// honours the visitor's reduced-motion preference.
export default function Reveal({ as = "div", delay = 0, className, children, ...rest }) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      transition={{ type: "spring", stiffness: 170, damping: 24, mass: 0.9, delay }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
