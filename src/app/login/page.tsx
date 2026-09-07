'use client';
import { useEffect } from 'react';
import { MemberAccess } from '@/components/MemberAccess';
function EnterStudio() { useEffect(() => { window.location.replace('/'); }, []); return <p>Abrindo seu estúdio…</p>; }
export default function LoginPage() { return <MemberAccess app="videos">{() => <EnterStudio />}</MemberAccess>; }
