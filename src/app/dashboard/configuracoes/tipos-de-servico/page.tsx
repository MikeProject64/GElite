'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSettings } from '@/components/settings-provider';
import { v4 as uuidv4 } from 'uuid';

interface TipoServico {
  id: string;
  name: string;
}

export default function TiposDeServicoPage() {
  const { settings, loadingSettings, updateSettings } = useSettings();
  const [tipos, setTipos] = useState<TipoServico[]>([]);
  const [novoTipo, setNovoTipo] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoNome, setEditandoNome] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!loadingSettings && settings && settings.serviceTypes) {
      setTipos(settings.serviceTypes);
    } else if (!loadingSettings) {
      setTipos([]);
    }
  }, [settings, loadingSettings]);

  const adicionarTipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTipo.trim()) return;
    setSalvando(true);
    const novo: TipoServico = { id: uuidv4(), name: novoTipo.trim() };
    const atualizados = [...tipos, novo];
    await updateSettings({ serviceTypes: atualizados });
    setNovoTipo('');
    setSalvando(false);
  };

  const iniciarEdicao = (tipo: TipoServico) => {
    setEditandoId(tipo.id);
    setEditandoNome(tipo.name);
  };

  const salvarEdicao = async (id: string) => {
    setSalvando(true);
    const atualizados = tipos.map(t => t.id === id ? { ...t, name: editandoNome } : t);
    await updateSettings({ serviceTypes: atualizados });
    setEditandoId(null);
    setEditandoNome('');
    setSalvando(false);
  };

  const removerTipo = async (id: string) => {
    setSalvando(true);
    const atualizados = tipos.filter(t => t.id !== id);
    await updateSettings({ serviceTypes: atualizados });
    setSalvando(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold md:text-2xl">Tipos de Serviço</h1>
      <Card>
        <CardHeader>
          <CardTitle>Gestão de Tipos de Serviço</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={adicionarTipo} className="flex gap-2 mb-4">
            <Input
              placeholder="Novo tipo de serviço"
              value={novoTipo}
              onChange={e => setNovoTipo(e.target.value)}
              disabled={salvando}
            />
            <Button type="submit" disabled={salvando || !novoTipo.trim()}>Adicionar</Button>
          </form>
          {loadingSettings ? (
            <p>Carregando...</p>
          ) : tipos && tipos.length > 0 ? (
            <ul className="space-y-2">
              {tipos.map((tipo) => (
                <li key={tipo.id} className="border rounded px-3 py-2 flex items-center gap-2">
                  {editandoId === tipo.id ? (
                    <>
                      <Input
                        value={editandoNome}
                        onChange={e => setEditandoNome(e.target.value)}
                        className="max-w-xs"
                        disabled={salvando}
                      />
                      <Button size="sm" onClick={() => salvarEdicao(tipo.id)} disabled={salvando || !editandoNome.trim()}>Salvar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditandoId(null)} disabled={salvando}>Cancelar</Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1">{tipo.name}</span>
                      <Button size="sm" variant="outline" onClick={() => iniciarEdicao(tipo)} disabled={salvando}>Editar</Button>
                      <Button size="sm" variant="destructive" onClick={() => removerTipo(tipo.id)} disabled={salvando}>Remover</Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Nenhum tipo de serviço cadastrado ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 