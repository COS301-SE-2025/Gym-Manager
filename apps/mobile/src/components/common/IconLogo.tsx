import React from 'react';
import { SvgXml } from 'react-native-svg';

const logoSvg = `<svg width="135" height="133" viewBox="0 0 135 133" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="135" height="133" rx="10" fill="black"/>
<g filter="url(#filter0_d_47_31)">
<path d="M88.6937 27H80.2944L70.0286 46.6364C67.3776 52.1591 70.0287 56.7614 75.9392 56.7614H98.6485C103.937 56.7614 105.492 61.6705 103.937 65.6591C102.382 69.6477 83.0942 108 83.0942 108H91.4935C91.4935 108 113.892 64.125 116.069 59.5227C118.247 54.9205 116.691 49.0909 110.47 48.4773C104.248 47.8636 86.5161 48.4773 86.5161 48.4773C82.161 48.4773 80.2944 45.1023 82.161 39.8864L88.6937 27Z" stroke="#D8FF3E" shape-rendering="crispEdges"/>
</g>
<g filter="url(#filter1_d_47_31)">
<path d="M71.8914 25H63.1512L47.0072 60.4667C44.4114 66.0667 47.0072 70.7333 52.7947 70.7333H75.0308C80.2091 70.7333 81.7321 75.7111 80.2091 79.7556C78.6861 83.8 66.1039 109 66.1039 109H75.0308C75.0308 109 89.9564 78.2 92.0887 73.5333C94.2209 68.8667 92.6979 62.9556 86.6058 62.3333C80.5137 61.7111 63.1512 62.3333 63.1512 62.3333C58.8868 62.3333 57.0591 58.9111 58.8868 53.6222L71.8914 25Z" stroke="#D8FF3E" shape-rendering="crispEdges"/>
</g>
<g filter="url(#filter2_d_47_31)">
<path d="M55.2862 25H46.5758L23.0286 74.9041C20.3776 80.4834 23.0287 85.1328 28.9392 85.1328H51.6485C56.9369 85.1328 58.4924 90.0923 56.9369 94.1218C55.3815 98.1513 49.9977 109 49.9977 109H60.2635C60.2635 109 66.8917 92.572 69.0693 87.9225C71.2469 83.2731 69.6914 77.3838 63.4697 76.7638C57.248 76.1439 39.5161 76.7638 39.5161 76.7638C35.1609 76.7638 33.2944 73.3542 35.1609 68.0849L55.2862 25Z" stroke="#D8FF3E" shape-rendering="crispEdges"/>
</g>
<defs>
<filter id="filter0_d_47_31" x="64.5" y="22.5" width="57" height="90" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset/>
<feGaussianBlur stdDeviation="2"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.847059 0 0 0 0 1 0 0 0 0 0.243137 0 0 0 1 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_47_31"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_47_31" result="shape"/>
</filter>
<filter id="filter1_d_47_31" x="41.5" y="20.5" width="56" height="93" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset/>
<feGaussianBlur stdDeviation="2"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.847059 0 0 0 0 1 0 0 0 0 0.243137 0 0 0 1 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_47_31"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_47_31" result="shape"/>
</filter>
<filter id="filter2_d_47_31" x="17.5" y="20.5" width="57" height="93" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset/>
<feGaussianBlur stdDeviation="2"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.847059 0 0 0 0 1 0 0 0 0 0.243137 0 0 0 1 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_47_31"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_47_31" result="shape"/>
</filter>
</defs>
</svg>`;

interface IconLogoProps {
  width?: number;
  height?: number;
}

export default function IconLogo({ width = 60, height = 58 }: IconLogoProps) {
  return <SvgXml xml={logoSvg} width={width} height={height} />;
} 