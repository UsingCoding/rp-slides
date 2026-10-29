import { defineMermaidSetup } from '@slidev/types'

// Keep in sync with styles/tokens.css. Mermaid renders inside a shadow root
// and cannot read CSS custom properties, so the palette is duplicated here.
const palette = {
  bg: '#F8FAFC',
  text: '#0F172A',
  primary: '#2563EB',
  primarySoft: '#DBEAFE',
  secondary: '#64748B',
  success: '#0F766E',
  warning: '#EA580C',
  codeBg: '#EEF2F7',
  border: '#CBD5E1',
}

const fontFamily = `'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`
const fontSize = '20px'

export default defineMermaidSetup(() => ({
  theme: 'base',
  fontFamily,
  themeVariables: {
    fontFamily,
    fontSize,
    background: palette.bg,

    primaryColor: palette.primarySoft,
    primaryTextColor: palette.text,
    primaryBorderColor: palette.primary,
    secondaryColor: palette.codeBg,
    secondaryTextColor: palette.text,
    secondaryBorderColor: palette.secondary,
    tertiaryColor: '#FFFFFF',
    tertiaryTextColor: palette.text,
    tertiaryBorderColor: palette.border,
    lineColor: palette.secondary,
    textColor: palette.text,

    // flowchart
    mainBkg: palette.primarySoft,
    nodeBorder: palette.primary,
    clusterBkg: palette.codeBg,
    clusterBorder: palette.border,
    edgeLabelBackground: palette.bg,

    // sequence diagram
    actorBkg: palette.primarySoft,
    actorBorder: palette.primary,
    actorTextColor: palette.text,
    actorLineColor: palette.secondary,
    signalColor: palette.text,
    signalTextColor: palette.text,
    labelBoxBkgColor: palette.codeBg,
    labelBoxBorderColor: palette.secondary,
    labelTextColor: palette.text,
    loopTextColor: palette.text,
    noteBkgColor: '#FFF7ED',
    noteBorderColor: palette.warning,
    noteTextColor: palette.text,
    activationBkgColor: palette.codeBg,
    activationBorderColor: palette.primary,

    // state diagram
    stateBkg: palette.primarySoft,
    stateLabelColor: palette.text,
    compositeBackground: palette.codeBg,
    transitionColor: palette.secondary,
    transitionLabelColor: palette.text,
  },
  sequence: {
    actorFontSize: fontSize,
    messageFontSize: fontSize,
    noteFontSize: fontSize,
    actorFontFamily: fontFamily,
    messageFontFamily: fontFamily,
    noteFontFamily: fontFamily,
    mirrorActors: false,
    height: 56,
    boxMargin: 8,
    messageMargin: 28,
    bottomMarginAdj: 0,
    useMaxWidth: true,
  },
  flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
  state: { useMaxWidth: true },
  // Rules are scoped to the SVG root by Mermaid: the diagram never exceeds
  // its container and keeps its aspect ratio (no scrollbars, no clipping).
  themeCSS: `
    max-width: 100% !important;
    max-height: 100%;
    .messageText, .actor, .labelText, .loopText, .noteText, .nodeLabel, .edgeLabel { font-size: ${fontSize}; }
  `,
}))
