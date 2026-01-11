import {
  MachineCategory,
  MachineCategoryExtractor,
  MachineCategoryFactory,
  MachineCategoryGenerator,
} from 'src/apiTypes';

// Category-based colors
export const categoryColors: Record<MachineCategory, string> = {
  [MachineCategoryFactory]: '#4056A1', // Deep blue for Production
  [MachineCategoryExtractor]: '#C97B2A', // Rich amber for Resource
  [MachineCategoryGenerator]: '#2E8B8B', // Deep teal for Power
};

// Station colors (darker for visibility)
export const trainStationColor = '#5A5A5A'; // Dark warm grey
export const droneStationColor = '#4A5A6A'; // Dark cool grey

// Machine group icon SVGs
export const iconifyFactory = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill="currentColor" d="M2 22V9.975L9 7v2l5-2v3h8v12zm9-4h2v-4h-2zm-4 0h2v-4H7zm8 0h2v-4h-2zm6.8-9.5h-4.625l.85-6.5H21z"/>
      </svg>`;

export const iconifyMiner = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
        <path fill="currentColor" d="M3.1.7a.5.5 0 0 1 .4-.2h9a.5.5 0 0 1 .4.2l2.976 3.974c.149.185.156.45.01.644L8.4 15.3a.5.5 0 0 1-.8 0L.1 5.3a.5.5 0 0 1 0-.6zm11.386 3.785l-1.806-2.41l-.776 2.413zm-3.633.004l.961-2.989H4.186l.963 2.995zM5.47 5.495L8 13.366l2.532-7.876zm-1.371-.999l-.78-2.422l-1.818 2.425zM1.499 5.5l5.113 6.817l-2.192-6.82zm7.889 6.817l5.123-6.83l-2.928.002z"/>
      </svg>`;

export const iconifyGenerator = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path fill="currentColor" d="M19.836 10.486a.9.9 0 0 1-.21.47l-9.75 10.71a.94.94 0 0 1-.49.33q-.125.015-.25 0a1 1 0 0 1-.41-.09a.92.92 0 0 1-.45-.46a.9.9 0 0 1-.07-.58l.86-6.86h-3.63a1.7 1.7 0 0 1-.6-.15a1.29 1.29 0 0 1-.68-.99a1.3 1.3 0 0 1 .09-.62l3.78-9.45c.1-.239.266-.444.48-.59a1.3 1.3 0 0 1 .72-.21h7.24c.209.004.414.055.6.15c.188.105.349.253.47.43c.112.179.18.38.2.59a1.2 1.2 0 0 1-.1.61l-2.39 5.57h3.65a1 1 0 0 1 .51.16a1 1 0 0 1 .43 1z"/>
     </svg>`;

// Station icon SVGs
export const iconifyTrainStation = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path fill="currentColor" d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h2.23l2-2H14l2 2h2v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4M7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17m3.5-7H6V6h5zm2 0V6h5v4zm3.5 7c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5s1.5.67 1.5 1.5s-.67 1.5-1.5 1.5"/>
     </svg>`;

export const iconifyDroneStation = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path fill="currentColor" d="M6.475 22Q4.6 22 3.3 20.675t-1.3-3.2T3.3 14.3T6.475 13q.55 0 1.063.125t.962.35q.35-.725.375-1.5t-.275-1.5q-.475.25-1 .375t-1.1.125q-1.875 0-3.187-1.312T2 6.474T3.313 3.3T6.5 2t3.188 1.3T11 6.475q0 .575-.137 1.1t-.388 1q.725.3 1.5.288t1.5-.363q-.225-.45-.35-.962T13 6.475Q13 4.6 14.3 3.3T17.475 2t3.2 1.3T22 6.475t-1.325 3.2t-3.2 1.325q-.6 0-1.137-.15t-1.038-.425q-.325.75-.3 1.538t.375 1.562q.475-.25 1-.387t1.1-.138q1.875 0 3.2 1.3T22 17.475t-1.325 3.2t-3.2 1.325t-3.175-1.325t-1.3-3.2q0-.575.138-1.1t.387-1q-.775-.35-1.563-.387t-1.537.287q.275.5.425 1.05t.15 1.15q0 1.875-1.325 3.2T6.475 22m11-13q1.05 0 1.788-.738T20 6.475t-.737-1.762T17.475 4t-1.763.713T15 6.475q0 .2.038.413t.087.412l1.5-1.5q.3-.3.7-.3t.7.3t.3.7t-.3.7l-1.55 1.575q.225.125.475.175t.525.05M6.5 8.975q.25 0 .475-.05T7.4 8.8L5.8 7.2q-.3-.3-.3-.7t.3-.7t.7-.3t.7.3l1.625 1.6q.075-.2.125-.437T9 6.475q0-1.05-.725-1.775T6.5 3.975T4.725 4.7T4 6.475t.725 1.775t1.775.725M17.475 20q1.05 0 1.787-.737T20 17.475t-.737-1.763T17.475 15q-.25 0-.475.038t-.425.112l1.65 1.65q.3.3.3.7t-.3.7q-.325.3-.725.3t-.7-.3l-1.625-1.625q-.075.2-.125.425t-.05.475q0 1.05.712 1.788t1.763.737m-11 0q1.05 0 1.788-.737T9 17.475q0-.275-.05-.537t-.175-.488l-1.75 1.75q-.3.3-.713.3t-.712-.3t-.3-.7t.3-.7l1.675-1.675q-.2-.05-.4-.088t-.4-.037q-1.05 0-1.763.713T4 17.475t.713 1.788T6.475 20M12 13q.425 0 .713-.288T13 12t-.288-.712T12 11t-.712.288T11 12t.288.713T12 13"/>
     </svg>`;
