import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, switchMap } from 'rxjs';
import { TradeService } from '../../services/trade.service';
import { PairService } from '../../services/pair.service';
import { ImageService } from '../../services/image.service';
import { Pair, Trade } from '../../utils/models';

@Component({
  selector: 'app-trades',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trades.component.html',
})
export class TradesComponent implements OnInit {
  isEdit = false;
  tradeId: number | null = null;
  sessionId!: number;
  pairs: Pair[] = [];
  loading = false;
  error = '';
  pendingFiles: File[] = [];

  form = {
    pairId: null as number | null,
    entry: null as number | null,
    tp: null as number | null,
    sl: null as number | null,
    entryDate: '',
    exitDate: '',
    direction: 'long' as 'long' | 'short',
    risk: null as number | null,
    fee: null as number | null,
    profit: null as number | null,
    result: 'W' as 'W' | 'BE' | 'L',
  };

  get profitDisabled(): boolean {
    return this.form.result === 'L' || this.form.result === 'BE';
  }

  onResultChange(): void {
    this.syncProfitFromResult();
  }

  onRiskChange(): void {
    this.syncProfitFromResult();
  }

  // Loss forfeits the full risked amount; break-even keeps the profit at 0
  private syncProfitFromResult(): void {
    if (this.form.result === 'L') this.form.profit = -Math.abs(this.form.risk ?? 0);
    else if (this.form.result === 'BE') this.form.profit = 0;
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.pendingFiles.push(...Array.from(input.files));
    input.value = '';
  }

  removeFile(index: number): void {
    this.pendingFiles.splice(index, 1);
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tradeService: TradeService,
    private pairService: PairService,
    private imageService: ImageService,
  ) {}

  ngOnInit(): void {
    this.sessionId = Number(this.route.snapshot.paramMap.get('sessionId'));
    this.tradeId = this.route.snapshot.paramMap.get('tradeId')
      ? Number(this.route.snapshot.paramMap.get('tradeId'))
      : null;
    this.isEdit = !!this.tradeId;

    this.pairService.getAll().subscribe({ next: (p) => (this.pairs = p) });

    if (this.isEdit && this.tradeId) {
      this.tradeService.getById(this.tradeId).subscribe({
        next: (t: Trade) => {
          this.sessionId = t.sessionId;
          this.form.pairId = t.pairId;
          this.form.entryDate = t.entryDate.substring(0, 16);
          this.form.exitDate = t.exitDate.substring(0, 16);
          this.form.direction = t.direction;
          this.form.entry = Number(t.entry);
          this.form.tp = Number(t.tp);
          this.form.sl = Number(t.sl);
          this.form.risk = Number(t.risk);
          this.form.fee = Number(t.fee);
          this.form.profit = Number(t.profit);
          this.form.result = t.result;
        },
      });
    }
  }

  onSubmit(): void {
    this.error = '';
    this.loading = true;
    const payload = {
      sessionId: this.sessionId,
      pairId: this.form.pairId!,
      entry: this.form.entry!,
      tp: this.form.tp!,
      sl: this.form.sl!,
      entryDate: this.form.entryDate,
      exitDate: this.form.exitDate,
      direction: this.form.direction,
      risk: this.form.risk!,
      fee: this.form.fee ?? 0,
      profit: this.form.result === 'L'
        ? -Math.abs(this.form.risk ?? 0)
        : this.form.result === 'BE' ? 0 : (this.form.profit ?? 0),
      result: this.form.result,
    };

    const request = this.isEdit && this.tradeId
      ? this.tradeService.update(this.tradeId, payload)
      : this.tradeService.create(payload);

    request.pipe(
      switchMap((trade: Trade) => {
        if (!this.pendingFiles.length) return of(trade);
        return this.imageService.getUploadUrls(trade.id, this.pendingFiles.length).pipe(
          switchMap(({ urls }) =>
            forkJoin(this.pendingFiles.map((file, i) =>
              this.imageService.uploadFile(urls[i].uploadUrl, file)
            ))
          ),
        );
      }),
    ).subscribe({
      next: () => this.isEdit && this.tradeId
        ? this.router.navigate(['/trades', this.tradeId])
        : this.router.navigate(['/sessions', this.sessionId]),
      error: (err: { error?: { message?: string } }) => {
        this.error = err.error?.message ?? 'Failed to save trade';
        this.loading = false;
      },
    });
  }
}
