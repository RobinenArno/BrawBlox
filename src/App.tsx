/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { Renderer } from './game/Renderer';
import { Swords, Zap, Shield, User, Trophy, Play, Heart, Ghost, Flame, Map as MapIcon, ChevronRight, ChevronLeft, Users, Star, Settings, Send, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { BRAWLER_TYPES, GameState, MAPS, Team, Club, ClubMessage, KILLS_TO_WIN } from './types';

type Screen = 'START' | 'MENU' | 'SELECT_BRAWLER' | 'SELECT_MAP' | 'CLUBS' | 'GAME' | 'GAMEOVER';

const MOCK_CLUBS: Club[] = [
  { 
    id: '1', 
    name: 'Blok Broeders', 
    icon: '🏰', 
    description: 'De sterkste club van de arena!', 
    memberCount: 15, 
    trophies: 4500,
    messages: [{ id: '1', senderName: 'Systeem', senderImage: '', text: 'Welkom bij de Blok Broeders!', timestamp: Date.now() }]
  },
  { 
    id: '2', 
    name: 'Ninja Squad', 
    icon: '🥷', 
    description: 'Snelheid is alles.', 
    memberCount: 8, 
    trophies: 2200,
    messages: [{ id: '1', senderName: 'Systeem', senderImage: '', text: 'Welkom Ninja!', timestamp: Date.now() }]
  },
  { 
    id: '3', 
    name: 'Mega Slopers', 
    icon: '💣', 
    description: 'Wij breken alles af.', 
    memberCount: 22, 
    trophies: 8900,
    messages: [{ id: '1', senderName: 'Systeem', senderImage: '', text: 'Slooptijd!', timestamp: Date.now() }]
  },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>('START');
  const [username, setUsername] = useState('');
  const [selectedBrawler, setSelectedBrawler] = useState<keyof typeof BRAWLER_TYPES>('BALANCE');
  const [selectedMap, setSelectedMap] = useState<keyof typeof MAPS>('ARENA');
  const [selectedTeam, setSelectedTeam] = useState<Team>('BLUE');
  const [myClub, setMyClub] = useState<Club | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId] = useState(`player-${Math.random().toString(36).substr(2, 9)}`);
  const [chatMessage, setChatMessage] = useState('');
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [myClub?.messages]);

  const sendClubMessage = () => {
    if (!chatMessage.trim() || !myClub) return;
    
    const brawler = BRAWLER_TYPES[selectedBrawler];
    const newMessage: ClubMessage = {
      id: Math.random().toString(36).substr(2, 9),
      senderName: username || brawler.name,
      senderImage: brawler.image,
      text: chatMessage,
      timestamp: Date.now()
    };

    setMyClub(prev => prev ? {
      ...prev,
      messages: [...prev.messages, newMessage]
    } : null);
    
    setChatMessage('');
  };
  
  const engineRef = useRef<GameEngine | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const mouseRef = useRef({ x: 0, y: 0, isDown: false });

  // Input listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
      // Prevent default scrolling for game keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      keysRef.current[e.code] = true; 
    };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    const handleMouseMove = (e: MouseEvent) => { 
      mouseRef.current.x = e.clientX; 
      mouseRef.current.y = e.clientY; 
    };
    const handleMouseDown = () => { mouseRef.current.isDown = true; };
    const handleMouseUp = () => { mouseRef.current.isDown = false; };
    const handleBlur = () => {
      // Clear all keys on blur to prevent sticking
      keysRef.current = {};
      mouseRef.current.isDown = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const startGame = () => {
    const engine = new GameEngine((state) => {
      setGameState(state);
      if (state.players[playerId]?.health <= 0 || state.playerWon || state.playerLost) {
        setScreen('GAMEOVER');
        engine.stop();
      }
    }, selectedMap);

    engineRef.current = engine;
    engine.addPlayer(playerId, selectedBrawler, username || BRAWLER_TYPES[selectedBrawler].name, selectedTeam);
    engine.start();
    setScreen('GAME');
    
    // Ensure canvas focus for keyboard input
    setTimeout(() => {
      const canvas = document.getElementById('game-canvas');
      canvas?.focus();
    }, 100);
  };

  // Input Processing Loop
  useEffect(() => {
    if (screen !== 'GAME' || !engineRef.current) return;

    const interval = setInterval(() => {
      const engine = engineRef.current;
      if (!engine) return;

      const moveDir = { x: 0, y: 0 };
      if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) moveDir.y -= 1;
      if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) moveDir.y += 1;
      if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) moveDir.x -= 1;
      if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) moveDir.x += 1;

      // Normalize diagonal movement
      const mag = Math.sqrt(moveDir.x**2 + moveDir.y**2);
      if (mag > 0) {
        moveDir.x /= mag;
        moveDir.y /= mag;
      }

      // Calculate aim angle based on screen center (Renderer always centers player)
      const dx = mouseRef.current.x - window.innerWidth / 2;
      const dy = mouseRef.current.y - window.innerHeight / 2;
      const angle = Math.atan2(dy, dx);

      engine.updateInput(playerId, moveDir, angle, mouseRef.current.isDown);
    }, 16);

    return () => clearInterval(interval);
  }, [screen, playerId]);

  const player = gameState?.players[playerId];

  return (
    <div className="relative w-full h-screen bg-bg-dark overflow-hidden font-bold text-white uppercase tracking-tighter italic">
      <AnimatePresence mode="wait">
        {screen === 'START' && (
          <motion.div 
            key="start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center w-full h-full bg-main-gradient p-8 text-center"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-panel p-16 rounded-[60px] border-4 border-white/20 flex flex-col items-center gap-10 max-w-2xl w-full shadow-[0_0_100px_rgba(255,100,200,0.2)]"
            >
               <h1 className="text-8xl font-black italic text-stroke-sm mb-4 tracking-tighter">WELKOM!</h1>
               <div className="w-full space-y-4">
                 <p className="text-center text-white/60 font-black uppercase tracking-[0.3em] text-sm">VOER JE NAAM IN</p>
                 <input 
                   type="text" 
                   value={username}
                   onChange={(e) => setUsername(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && username.length >= 3 && setScreen('MENU')}
                   placeholder="JE NAAM..."
                   className="w-full bg-black/40 border-4 border-white/30 rounded-3xl p-6 text-4xl font-black italic text-center text-accent-yellow placeholder:text-white/10 focus:border-accent-yellow outline-none transition-all shadow-xl uppercase"
                   maxLength={15}
                   autoFocus
                 />
                 <p className="text-center text-white/40 text-xs font-black uppercase tracking-widest">MINIMAAL 3 TEKENS</p>
               </div>

               <button 
                 disabled={username.length < 3}
                 onClick={() => setScreen('MENU')}
                 className={cn(
                   "w-full py-8 rounded-[35px] font-black text-5xl italic text-stroke-sm transition-all shadow-2xl",
                   username.length >= 3 ? "bg-accent-yellow text-white play-button-shadow hover:scale-105" : "bg-white/10 text-white/10 grayscale cursor-not-allowed border-2 border-white/5"
                 )}
               >
                 DOORGAAN
               </button>
            </motion.div>
          </motion.div>
        )}

        {screen === 'MENU' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="flex flex-col items-center justify-center w-full h-full space-y-8 bg-main-gradient"
          >
            <div className="relative">
              <motion.h1 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="text-9xl font-black text-white text-stroke-md"
              >
                BRAWLBLOX
              </motion.h1>
              <div className="absolute -top-4 -right-12 px-5 py-2 bg-accent-pink text-white text-sm font-black rounded-xl rotate-12 border-4 border-white animate-pulse">
                ROBLOX EDITIE
              </div>
            </div>
            
            <p className="text-accent-blue text-2xl opacity-90 tracking-[0.2em] font-black text-stroke-sm">
              BLOKKIG GEVECHT • SNELLE ARENA'S
            </p>

            <div className="p-10 glass-panel rounded-[50px] flex flex-col items-center gap-8 border-4 border-white/20">
               <div className="flex gap-6">
                  <motion.button 
                    whileHover={{ scale: 1.2, rotate: 10 }} 
                    onClick={() => setScreen('CLUBS')}
                    className="w-16 h-16 bg-accent-pink rounded-2xl border-4 border-white flex items-center justify-center text-3xl shadow-xl"
                  >
                    <Users size={32} />
                  </motion.button>
                  <motion.div whileHover={{ scale: 1.2, rotate: -10 }} className="w-16 h-16 bg-accent-blue rounded-2xl border-4 border-white flex items-center justify-center text-3xl shadow-xl cursor-default">🏆</motion.div>
                  <motion.div whileHover={{ scale: 1.2, rotate: 5 }} className="w-16 h-16 bg-accent-yellow rounded-2xl border-4 border-white flex items-center justify-center text-3xl shadow-xl cursor-default">⚙️</motion.div>
               </div>

              <div className="flex flex-col gap-4">
                <button
                  onClick={() => setScreen('SELECT_BRAWLER')}
                  className="group relative w-96 py-8 bg-gradient-to-b from-accent-yellow to-yellow-600 rounded-3xl font-black text-6xl transition-all hover:scale-110 active:scale-95 text-white text-stroke-sm play-button-shadow"
                >
                  SPELEN!
                </button>
                <button
                   onClick={() => setScreen('CLUBS')}
                   className="w-full py-5 glass-panel rounded-2xl font-black text-2xl flex items-center justify-center gap-4 hover:bg-white/10 transition"
                >
                  <Users size={24} /> CLUBS
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {screen === 'SELECT_BRAWLER' && (
          <motion.div
            key="select_brawler"
            initial={{ opacity: 0, x: 200 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -200 }}
            className="flex flex-col items-center justify-center w-full h-full p-8 bg-main-gradient overflow-y-auto"
          >
            <h2 className="text-7xl font-black mb-12 flex items-center gap-6 italic text-stroke-sm tracking-tighter">
              <User size={72} className="text-accent-pink" /> KIES EEN KNOKKER
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 w-full max-w-7xl">
              {Object.entries(BRAWLER_TYPES).map(([key, b]) => (
                <button
                  key={key}
                  onClick={() => setSelectedBrawler(key as any)}
                  className={cn(
                    "relative flex flex-col p-6 rounded-[35px] transition-all duration-300 transform border-4 overflow-hidden",
                    selectedBrawler === key 
                      ? "bg-white/10 border-accent-blue scale-105 shadow-[0_0_100px_rgba(0,229,255,0.25)]" 
                      : "bg-black/20 border-white/5 opacity-50 hover:opacity-100 hover:scale-105"
                  )}
                >
                  <div className="relative w-full aspect-square mb-6 rounded-2xl shadow-inner border-4 border-white overflow-hidden">
                    <img 
                      src={b.image} 
                      alt={b.name} 
                      className="absolute inset-0 w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      {key === 'BALANCE' && <Swords size={40} color="white" strokeWidth={3} />}
                      {key === 'TANK' && <Shield size={40} color="white" strokeWidth={3} />}
                      {key === 'SNIPER' && <Zap size={40} color="white" strokeWidth={3} />}
                      {key === 'ASSASSIN' && <Ghost size={40} color="white" strokeWidth={3} />}
                      {key === 'WIZARD' && <Flame size={40} color="white" strokeWidth={3} />}
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-black mb-4 italic text-stroke-sm">{b.name}</h3>
                  
                  <div className="space-y-2 text-left w-full text-xs">
                    <div className="flex justify-between bg-black/40 px-3 py-1 rounded-lg">
                      <span className="text-accent-pink">HP</span>
                      <span>{b.health}</span>
                    </div>
                    <div className="flex justify-between bg-black/40 px-3 py-1 rounded-lg">
                      <span className="text-accent-blue">KRACHT</span>
                      <span>{b.damage}</span>
                    </div>
                  </div>

                  {selectedBrawler === key && (
                    <div className="absolute -top-4 -right-4 bg-accent-yellow text-black text-xs font-black px-4 py-2 rounded-xl border-4 border-white shadow-xl animate-bounce">
                      GEREED!
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-16 flex gap-8">
              <button
                onClick={() => setScreen('MENU')}
                className="px-12 py-5 glass-panel rounded-2xl font-black text-2xl opacity-60 hover:opacity-100 transition"
              >
                MENU
              </button>
              <button
                onClick={() => setScreen('SELECT_MAP')}
                className="px-20 py-5 bg-accent-blue text-black rounded-2xl font-black text-3xl hover:scale-110 active:scale-95 shadow-2xl transition-all"
              >
                VERDER <ChevronRight className="inline ml-2" size={32} />
              </button>
            </div>
          </motion.div>
        )}

        {screen === 'SELECT_MAP' && (
          <motion.div
            key="select_map"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="flex flex-col items-center justify-center w-full h-full p-8 bg-main-gradient"
          >
             <h2 className="text-7xl font-black mb-6 flex items-center gap-6 italic text-stroke-sm tracking-tighter">
              <MapIcon size={72} className="text-accent-yellow" /> KIES EEN WERELD
            </h2>

            {/* Team Selection */}
            <div className="flex gap-4 mb-12 bg-black/40 p-3 rounded-[35px] border-4 border-white/10">
               <button 
                onClick={() => setSelectedTeam('BLUE')}
                className={cn(
                  "px-10 py-5 rounded-[25px] font-black text-3xl transition-all",
                  selectedTeam === 'BLUE' ? "bg-accent-blue text-white shadow-[0_0_30px_rgba(0,229,255,0.5)]" : "opacity-40"
                )}
               >
                 TEAM BLAUW
               </button>
               <button 
                onClick={() => setSelectedTeam('RED')}
                className={cn(
                  "px-10 py-5 rounded-[25px] font-black text-3xl transition-all",
                  selectedTeam === 'RED' ? "bg-accent-pink text-white shadow-[0_0_30px_rgba(255,0,122,0.5)]" : "opacity-40"
                )}
               >
                 TEAM ROOD
               </button>
            </div>

            <div className="flex gap-10">
              {Object.entries(MAPS).map(([key, m]) => (
                <button
                  key={key}
                  onClick={() => setSelectedMap(key as any)}
                  className={cn(
                    "flex flex-col items-center p-8 rounded-[50px] border-4 transition-all duration-300 w-80",
                    selectedMap === key 
                      ? "bg-white/10 border-accent-yellow scale-110 shadow-2xl" 
                      : "bg-black/30 border-white/10 opacity-60 hover:opacity-100"
                  )}
                >
                   <div className="w-full h-48 rounded-[35px] mb-6 flex items-center justify-center border-4 border-white overflow-hidden relative shadow-lg">
                      <img 
                        src={m.image} 
                        alt={m.name} 
                        className="absolute inset-0 w-full h-full object-cover opacity-60"
                        referrerPolicy="no-referrer"
                      />
                      <div className="relative z-10 flex flex-wrap gap-2 justify-center p-4">
                         {m.obstacles.map((_, i) => (
                           <div key={i} className="w-8 h-8 bg-slate-500 border-2 border-slate-700 rounded-lg" />
                         ))}
                      </div>
                   </div>
                   <span className="text-3xl font-black italic text-stroke-sm">{m.name}</span>
                </button>
              ))}
            </div>

            <div className="mt-20 flex gap-8">
               <button
                onClick={() => setScreen('SELECT_BRAWLER')}
                className="px-12 py-5 glass-panel rounded-2xl font-black text-2xl opacity-60 hover:opacity-100 transition"
              >
                <ChevronLeft className="inline mr-2" size={32} /> TERUG
              </button>
              <button
                onClick={startGame}
                className="px-24 py-6 bg-gradient-to-b from-accent-yellow to-yellow-600 rounded-3xl font-black text-5xl italic text-stroke-sm animate-pulse play-button-shadow transition-all hover:scale-110"
              >
                VECHT NU!
              </button>
            </div>
          </motion.div>
        )}

        {screen === 'GAME' && gameState && (
          <div key="game" className="relative w-full h-full">
            <Renderer state={gameState} playerId={playerId} />
            
            {/* HUD */}
            <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start pointer-events-none">
              <div className="flex flex-col gap-4">
                 <div className="flex items-center gap-5 glass-panel p-3 pr-8 rounded-full border-4 border-white/30">
                    <div className="w-16 h-16 rounded-full border-4 border-white overflow-hidden shadow-xl bg-black/20">
                      {player && (
                        <img 
                          src={player.image} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-black text-3xl italic text-stroke-sm tracking-tight">{player?.name || '---'}</span>
                      <span className="text-accent-blue text-sm font-black uppercase tracking-widest leading-none">Kracht Niveau {player?.powerLevel || 0}</span>
                    </div>
                 </div>
                 
                 <div className="w-96 h-12 bg-black/50 backdrop-blur rounded-full border-4 border-white/30 p-1.5 shadow-2xl">
                   <motion.div 
                    initial={false}
                    animate={{ width: `${(player?.health || 0) / (player?.maxHealth || 1) * 100}%` }}
                    className="h-full bg-gradient-to-r from-accent-pink to-pink-400 rounded-full shadow-[0_0_30px_rgba(255,0,122,0.5)]"
                   />
                 </div>
              </div>

              {/* Football Scoreboard */}
              {gameState.map.isFootball && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-4 glass-panel px-8 py-3 rounded-3xl border-4 border-white/30 backdrop-blur-xl shadow-2xl">
                  <div className="flex items-center gap-4">
                    <span className="text-accent-blue text-4xl font-black italic text-stroke-sm">{gameState.teamScores.BLUE}</span>
                    <div className="w-4 h-4 rounded-full bg-white opacity-20" />
                    <span className="text-accent-pink text-4xl font-black italic text-stroke-sm">{gameState.teamScores.RED}</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-5 items-end">
                <div className="flex items-center gap-8 glass-panel px-10 py-5 rounded-[35px] border-4 border-white/30 shadow-2xl">
                  <div className="flex items-center gap-5">
                    <Trophy className="text-accent-yellow" size={48} />
                    <span className="text-6xl font-black italic text-stroke-sm">{player?.score || 0}</span>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="glass-panel px-5 py-3 rounded-2xl font-black text-accent-yellow flex items-center gap-3 border-2 border-white/10 uppercase tracking-[0.2em] text-md">
                    ● {12450 + (player?.score || 0) * 100}
                  </div>
                  <div className="glass-panel px-5 py-3 rounded-2xl font-black text-accent-blue flex items-center gap-3 border-2 border-white/10 uppercase tracking-[0.2em] text-md">
                    ♦ 340
                  </div>
                </div>
              </div>
            </div>

            {/* In-Game Notifications */}
            <AnimatePresence>
                {player && player.powerLevel > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0, rotate: -20 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    key={`pwr-${player.powerLevel}`}
                    className="absolute bottom-40 left-1/2 -translate-x-1/2 bg-gradient-to-br from-accent-yellow to-yellow-600 text-white px-10 py-4 rounded-3xl font-black italic shadow-[0_0_50px_rgba(255,210,0,0.5)] border-4 border-white flex flex-col items-center"
                  >
                    <span className="text-4xl text-stroke-sm">LEVEL UP!</span>
                    <span className="text-xl text-black tracking-widest mt-1 font-bold">JE GROEIT! +BEREIK +SCHADE</span>
                  </motion.div>
                )}
            </AnimatePresence>

            <div className="absolute bottom-10 left-10 p-8 glass-panel rounded-[40px] border-4 border-white/30 pointer-events-none">
              <p className="text-md font-black text-accent-pink mb-4 tracking-[0.3em]">BESTURING</p>
              <div className="flex gap-12 items-center font-black">
                <div className="flex items-center gap-4">
                   <div className="flex flex-col gap-1 items-center">
                      <span className="px-4 py-2 bg-white text-black rounded-xl text-2xl">W</span>
                      <div className="flex gap-1">
                        <span className="px-4 py-2 bg-white text-black rounded-xl text-2xl">A</span>
                        <span className="px-4 py-2 bg-white text-black rounded-xl text-2xl">S</span>
                        <span className="px-4 py-2 bg-white text-black rounded-xl text-2xl">D</span>
                      </div>
                   </div>
                  <span className="text-white uppercase italic text-2xl tracking-tighter">BEWEGEN</span>
                </div>
                <div className="w-px h-16 bg-white/20" />
                <div className="flex items-center gap-4">
                  <div className="px-6 py-4 bg-accent-blue text-black rounded-2xl text-2xl italic">MUIS</div>
                  <span className="text-white uppercase italic text-2xl tracking-tighter">MIK & SCHIET</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {screen === 'CLUBS' && (
          <motion.div
            key="clubs"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="flex flex-col items-center justify-center w-full h-full p-12 bg-main-gradient overflow-hidden"
          >
             <h2 className="text-7xl font-black mb-12 flex items-center gap-6 italic text-stroke-sm tracking-tighter">
              <Users size={72} className="text-accent-pink" /> {myClub ? `CLUB: ${myClub.name}` : 'ONTDEK CLUBS'}
            </h2>

            {!myClub ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl overflow-y-auto max-h-[60vh] p-4">
                {MOCK_CLUBS.map(club => (
                  <div key={club.id} className="glass-panel p-8 rounded-[45px] border-4 border-white/20 flex flex-col items-center text-center">
                    <div className="text-7xl mb-6">{club.icon}</div>
                    <h3 className="text-4xl font-black mb-2 italic text-stroke-sm">{club.name}</h3>
                    <p className="text-white/60 mb-8 font-black uppercase text-xs tracking-widest">{club.description}</p>
                    
                    <div className="flex gap-8 w-full mb-8">
                        <div className="flex-1 bg-black/40 p-4 rounded-2xl text-center">
                          <span className="block text-accent-blue text-xs font-black uppercase mb-1">Leden</span>
                          <span className="text-2xl font-black italic">{club.memberCount}/30</span>
                        </div>
                        <div className="flex-1 bg-black/40 p-4 rounded-2xl text-center">
                          <span className="block text-accent-yellow text-xs font-black uppercase mb-1">Trofeeën</span>
                          <span className="text-2xl font-black italic">{club.trophies}</span>
                        </div>
                    </div>

                    <button 
                      onClick={() => setMyClub(club)}
                      className="w-full py-5 rounded-2xl font-black text-2xl bg-white text-black hover:scale-105 transition-all"
                    >
                      WORD LID
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-8 w-full max-w-7xl h-[60vh]">
                 {/* Club Info */}
                 <div className="w-full md:w-1/3 glass-panel p-10 rounded-[45px] border-4 border-white/20 flex flex-col items-center text-center">
                    <div className="text-8xl mb-6">{myClub.icon}</div>
                    <h3 className="text-5xl font-black mb-4 italic text-stroke-sm">{myClub.name}</h3>
                    <p className="text-white/60 mb-8 font-black uppercase text-sm tracking-widest bg-black/30 px-6 py-3 rounded-full">{myClub.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4 w-full mt-auto mb-8">
                        <div className="bg-black/40 p-5 rounded-3xl text-center">
                          <span className="block text-accent-blue text-xs font-black uppercase mb-1">Leden</span>
                          <span className="text-3xl font-black italic">{myClub.memberCount}/30</span>
                        </div>
                        <div className="bg-black/40 p-5 rounded-3xl text-center">
                          <span className="block text-accent-yellow text-xs font-black uppercase mb-1">Trofeeën</span>
                          <span className="text-3xl font-black italic">{myClub.trophies}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 w-full">
                      <button 
                        onClick={() => setIsLeaveModalOpen(true)}
                        className="w-full py-5 rounded-2xl font-black text-xl bg-red-600/20 text-red-500 border-2 border-red-500/30 hover:bg-red-600 hover:text-white transition-all shadow-lg"
                      >
                        VERLAAT CLUB
                      </button>
                    </div>
                 </div>

                 <AnimatePresence>
                   {isLeaveModalOpen && (
                     <motion.div 
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       exit={{ opacity: 0 }}
                       className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-8"
                     >
                       <motion.div 
                         initial={{ scale: 0.8, y: 50 }}
                         animate={{ scale: 1, y: 0 }}
                         exit={{ scale: 0.8, y: 50 }}
                         className="glass-panel p-12 rounded-[50px] border-4 border-white/30 max-w-lg w-full text-center shadow-[0_0_100px_rgba(255,0,0,0.3)]"
                       >
                          <div className="text-8xl mb-8">❓</div>
                          <h3 className="text-5xl font-black mb-4 italic text-stroke-sm">CLUB VERLATEN?</h3>
                          <p className="text-white/60 mb-10 font-bold uppercase tracking-widest leading-relaxed">
                            Weet je zeker dat je <span className="text-accent-pink">{myClub.name}</span> wilt verlaten? Je verliest toegang tot de chat!
                          </p>
                          
                          <div className="flex flex-col gap-4">
                            <button 
                              onClick={() => {
                                setMyClub(null);
                                setIsLeaveModalOpen(false);
                              }}
                              className="w-full py-6 bg-red-600 text-white rounded-3xl font-black text-2xl italic text-stroke-sm hover:scale-105 transition-all shadow-xl"
                            >
                              JA, VERLATEN!
                            </button>
                            <button 
                              onClick={() => setIsLeaveModalOpen(false)}
                              className="w-full py-5 glass-panel text-white rounded-2xl font-black text-xl hover:bg-white/10 transition-all"
                            >
                              NEE, BLIJVEN!
                            </button>
                          </div>
                       </motion.div>
                     </motion.div>
                   )}
                 </AnimatePresence>

                 {/* Club Chat */}
                 <div className="flex-1 glass-panel rounded-[45px] border-4 border-white/20 flex flex-col overflow-hidden">
                    <div className="bg-black/20 p-6 flex items-center gap-4 border-b-4 border-white/10">
                       <MessageSquare className="text-accent-blue" />
                       <span className="text-2xl font-black italic text-stroke-sm">CLUB CHAT</span>
                    </div>

                    <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth">
                       {myClub.messages.map(msg => (
                         <div key={msg.id} className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-black/40 flex-shrink-0">
                               {msg.senderImage ? (
                                 <img src={msg.senderImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                               ) : (
                                 <div className="w-full h-full flex items-center justify-center text-xl">🤖</div>
                               )}
                            </div>
                            <div className="flex flex-col gap-1">
                               <div className="flex items-center gap-3">
                                  <span className="text-accent-yellow text-sm font-black uppercase tracking-wider">{msg.senderName}</span>
                                  <span className="text-white/20 text-[10px] font-black">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                               </div>
                               <div className="bg-white/5 border-2 border-white/5 rounded-2xl rounded-tl-none p-4 max-w-md text-white font-black italic tracking-tight">
                                  {msg.text}
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>

                    <div className="p-6 bg-black/30 border-t-4 border-white/10 flex gap-4">
                       <input 
                        type="text" 
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendClubMessage()}
                        placeholder="STUUR EEN BERICHT..." 
                        className="flex-1 bg-black/40 border-4 border-white/10 rounded-2xl px-6 py-4 font-black italic focus:outline-none focus:border-accent-blue transition-all"
                       />
                       <button 
                        onClick={sendClubMessage}
                        className="w-16 h-16 bg-accent-blue text-black rounded-2xl border-4 border-white flex items-center justify-center transition-all hover:scale-110 active:scale-90"
                       >
                         <Send size={28} />
                       </button>
                    </div>
                 </div>
              </div>
            )}

            <button
               onClick={() => setScreen('MENU')}
               className="mt-12 px-16 py-5 glass-panel rounded-2xl font-black text-3xl opacity-60 hover:opacity-100 transition"
            >
              TERUG NAAR MENU
            </button>
          </motion.div>
        )}
        {screen === 'GAMEOVER' && (
          <motion.div
             key="gameover"
             initial={{ opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             className={cn(
               "flex flex-col items-center justify-center w-full h-full backdrop-blur-3xl p-8",
               gameState.playerWon ? "bg-accent-yellow/30" : "bg-accent-pink/30"
             )}
          >
            <h2 className={cn(
              "text-[14rem] font-black text-white mb-6 italic tracking-tighter text-stroke-md leading-none animate-pulse",
              gameState.playerWon && "text-accent-yellow"
            )}>
              {gameState.playerWon ? 'WINNAAR!' : (gameState.loseReason === 'SHRUNK' ? 'TE KLEIN!' : 'K.O.!')}
            </h2>
            <p className="text-5xl text-white mb-16 font-black uppercase tracking-[0.5em] italic text-stroke-sm">
              {gameState.playerWon ? 'JE HEBT DE ARENA DOMINANT!' : 'VOLGENDE KEER BETER!'}
            </p>
            
            <div className="glass-panel p-16 rounded-[60px] border-4 border-white/30 shadow-[0_0_150px_rgba(255,255,255,0.2)] mb-16 min-w-[600px] text-center">
              <p className="text-accent-blue uppercase text-2xl font-black tracking-widest mb-4 italic">STATISTIEKEN</p>
              <div className="flex justify-around items-center">
                <div>
                  <p className="text-white/40 uppercase text-sm font-black mb-2">KILLS</p>
                  <p className="text-9xl font-black text-white italic text-stroke-sm">{player?.score || 0}</p>
                </div>
                <div className="w-1 h-24 bg-white/10" />
                <div>
                  <p className="text-white/40 uppercase text-sm font-black mb-2">DOEL</p>
                  <p className="text-9xl font-black text-white italic text-stroke-sm opacity-50">{KILLS_TO_WIN}</p>
                </div>
              </div>
              <div className="h-4 bg-white/10 my-10 rounded-full overflow-hidden">
                 <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, ((player?.score || 0) / KILLS_TO_WIN) * 100)}%` }}
                    className={cn("h-full", gameState.playerWon ? "bg-accent-yellow shadow-[0_0_20px_#fbbf24]" : "bg-accent-pink")}
                 />
              </div>
            </div>

            <div className="flex gap-8">
              <button
                onClick={() => setScreen('MENU')}
                className="px-16 py-6 glass-panel rounded-[30px] font-black text-3xl hover:bg-white/20 transition"
              >
                UITGANG
              </button>
              <button
                onClick={startGame}
                className="px-24 py-6 bg-gradient-to-b from-accent-yellow to-yellow-600 text-white rounded-[30px] font-black text-5xl italic text-stroke-sm play-button-shadow transition-all hover:scale-110 active:scale-95"
              >
                OPNIEUW!
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
