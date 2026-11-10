import { motion } from "framer-motion";

// Gentle fade-up when a block scrolls into view. MotionConfig in App.jsx
// honours the visitor's reduced-motion preference.
export default function Reveal({ as = "div", delay = 0, className, children, ...rest }) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
