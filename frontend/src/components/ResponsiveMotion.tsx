import { useEffect, useState, ComponentPropsWithoutRef, ReactNode } from "react";
import { motion, TargetAndTransition, VariantLabels, Transition, MotionProps } from "framer-motion";

// Allowed semantic tags for layout
type AllowedTags = "div" | "main" | "section" | "header" | "footer" | "article" | "nav";

// Only pick HTML props that are 100% safe for both <Tag> and <motion.div>
type SafeHTMLProps = Pick<
  ComponentPropsWithoutRef<"div">,
  "id" | "className" | "style" | "children" | "tabIndex" | "title" | "role" | "aria-label" | "aria-labelledby" | "aria-describedby"
>;

interface ResponsiveMotionProps extends SafeHTMLProps {
  as?: AllowedTags;
  initial?: false | TargetAndTransition | VariantLabels;
  animate?: TargetAndTransition | VariantLabels;
  transition?: Transition;
  children: ReactNode;
}

/**
 * ResponsiveMotion
 * Usage:
 * <ResponsiveMotion as="main" id="my-id" className="..." style={{...}}>
 *   ...children...
 * </ResponsiveMotion>
 */
export default function ResponsiveMotion({
  children,
  as = "div",
  initial = { opacity: 0, y: 40 },
  animate = { opacity: 1, y: 0 },
  transition = { duration: 0.8, ease: [0.39, 0.58, 0.57, 1] },
  ...rest
}: ResponsiveMotionProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 700);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const Tag = as;

  if (isMobile) {
    // On mobile: render plain HTML tag with only safe HTML props
    return (
      <Tag {...rest}>
        {children}
      </Tag>
    );
  }

  // On desktop/tablet: render motion.div with animation and safe HTML props
  return (
    <motion.div
      initial={initial}
      animate={animate}
      transition={transition}
      {...rest}
    >
      {children}
    </motion.div>
  );
}