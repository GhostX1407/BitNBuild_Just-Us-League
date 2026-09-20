import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  PhoneCall,
  MapPin,
  Camera,
  CheckCircle2,
  Mic,
  MicOff,
  Shield,
  ArrowRight,
  Compass,
  Phone,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { api } from '../../services/api';
import { IngestResponse } from '../../types/domain';
import { cn } from '../../utils/format';

export const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'citizen' | 'call'>('citizen');

  // Citizen Form State
  const [text, setText] = useState('');
  const [locationText, setLocationText] = useState('Sayaji Baug Zoo North Gate, Vadodara');
  const [phone, setPhone] = useState('+91 98251 22334');
  const [photoUrl, setPhotoUrl] = useState('');
  const [lat, setLat] = useState(22.3134);
  const [lng, setLng] = useState(73.1895);

  // Call Log State
  const [callerPhone, setCallerPhone] = useState('+91 94260 55441');
  const [transcript, setTranscript] = useState(
    'Emergency call received: Water is gushing onto the road near Kala Ghoda bridge. 3 vehicles stuck, need urgent rescue.'
  );
  const [isRecording, setIsRecording] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestResponse | null>(null);

  // Web Speech API for voice dictation in call form
  const toggleSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please type transcript manually.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);
      recognition.onresult = (e: any) => {
        const spoken = e.results[0][0].transcript;
        setTranscript((prev) => (prev ? `${prev} ${spoken}` : spoken));
      };

      recognition.start();
    } catch (e) {
      setIsRecording(false);
    }
  };

  const handleCitizenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    try {
      const res = await api.ingestCitizen({
        text,
        location_text: locationText,
        phone,
        photo_url: photoUrl,
        lat,
        lng,
      });
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcript.trim()) return;

    setLoading(true);
    try {
      const res = await api.ingestCall({
        caller_phone: callerPhone,
        transcript,
        location_text: locationText,
        lat,
        lng,
      });
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 flex items-center justify-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-xl space-y-5">
        {/* Reassuring Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
            <Shield className="w-3.5 h-3.5" />
            <span>Vadodara Unified Emergency Coordination System</span>
          </div>
          <h1 className="text-2xl font-heading font-bold text-slate-900">
            Report an Emergency
          </h1>
          <p className="text-xs text-slate-500 font-sans max-w-md mx-auto">
            Instant AI triage and automatic dispatch to nearby emergency responders in Vadodara.
          </p>
        </div>

        {/* Successful Submission Card */}
        {result ? (
          <Card elevation="raised" className="p-6 text-center space-y-5 shadow-tile">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-sm">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-heading font-bold text-slate-900">
                Emergency Report Dispatched
              </h2>
              <p className="text-xs text-slate-500">
                AI triage completed in 1.2s. Units in your sector have received this incident.
              </p>
            </div>

            {/* Tracking ID & Summary Tile */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-left text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-medium">Tracking Reference:</span>
                <span className="font-mono font-bold text-blue-600 text-sm">{result.track_id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">AI Classification:</span>
                <span className="font-semibold text-slate-900 uppercase">
                  {result.classification?.type} · {result.classification?.priority}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Pipeline Action:</span>
                <span className="font-semibold text-emerald-600 uppercase">
                  {result.action} into incident
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <Button
                variant="primary"
                className="flex-1"
                icon={<Compass className="w-4 h-4" />}
                onClick={() => navigate(`/track/${result.track_id}`)}
              >
                Track Live Response
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setResult(null);
                  setText('');
                }}
              >
                Submit Another Report
              </Button>
            </div>
          </Card>
        ) : (
          /* Report Form 3D Tile */
          <Card elevation="raised" className="p-6 space-y-5 shadow-tile">
            {/* Tab Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setTab('citizen')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none',
                  tab === 'citizen'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-900'
                )}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Citizen Web Report</span>
              </button>

              <button
                type="button"
                onClick={() => setTab('call')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none',
                  tab === 'call'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-900'
                )}
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>112 Call Log Intake</span>
              </button>
            </div>

            {/* Form 1: Citizen Web Form */}
            {tab === 'citizen' ? (
              <form onSubmit={handleCitizenSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Emergency Description *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe what happened (e.g. water overflowing onto main road, smoke from industrial warehouse, casualties...)"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-sans text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Location in Vadodara *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-rose-500" />
                    <input
                      type="text"
                      required
                      placeholder="Landmark, road, or area name..."
                      value={locationText}
                      onChange={(e) => setLocationText(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-sans text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Contact Phone
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-sans text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Photo Link (Optional)
                    </label>
                    <div className="relative">
                      <Camera className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="url"
                        placeholder="https://..."
                        value={photoUrl}
                        onChange={(e) => setPhotoUrl(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-sans text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full mt-2"
                  size="lg"
                  disabled={loading || !text.trim()}
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  {loading ? 'Submitting & Classifying...' : 'Submit Emergency Report'}
                </Button>
              </form>
            ) : (
              /* Form 2: 112 Emergency Call Log */
              <form onSubmit={handleCallSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      Operator Call Transcript *
                    </label>
                    <button
                      type="button"
                      onClick={toggleSpeechRecognition}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer border shadow-sm',
                        isRecording
                          ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="w-3.5 h-3.5 text-rose-600" />
                          <span>Listening...</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5 text-blue-600" />
                          <span>Voice Dictation</span>
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    required
                    placeholder="Type or record verbatim operator call notes..."
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-sans text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Caller Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={callerPhone}
                      onChange={(e) => setCallerPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-sans text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Location Reference *
                    </label>
                    <input
                      type="text"
                      required
                      value={locationText}
                      onChange={(e) => setLocationText(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-sans text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-sm"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full mt-2"
                  size="lg"
                  disabled={loading || !transcript.trim()}
                  icon={<Sparkles className="w-4 h-4 text-amber-300" />}
                >
                  {loading ? 'Processing Call...' : 'Log & Triage Call'}
                </Button>
              </form>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};
