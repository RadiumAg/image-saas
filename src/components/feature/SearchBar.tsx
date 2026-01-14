'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Search, X, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { format } from 'date-fns';

export interface SearchFilters {
  query?: string;
  startDate?: string;
  endDate?: string;
}

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void;
  className?: string;
}

export function SearchBar({ onSearch, className }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isExpanded, setIsExpanded] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const handleSearch = () => {
    const filters: SearchFilters = {};
    
    if (query.trim()) {
      filters.query = query.trim();
    }
    
    if (startDate) {
      filters.startDate = format(startDate, 'yyyy-MM-dd');
    }
    
    if (endDate) {
      filters.endDate = format(endDate, 'yyyy-MM-dd');
    }
    
    onSearch(filters);
  };

  const handleClear = () => {
    setQuery('');
    setStartDate(undefined);
    setEndDate(undefined);
    setIsExpanded(false);
    onSearch({});
  };

  const hasFilters = query || startDate || endDate;

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* 主搜索栏 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索图片名称或标签..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-4"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'transition-colors',
            isExpanded && 'bg-accent'
          )}
        >
          <Calendar className="h-4 w-4" />
        </Button>
        
        <Button onClick={handleSearch}>
          搜索
        </Button>
        
        {hasFilters && (
          <Button variant="outline" onClick={handleClear}>
            <X className="h-4 w-4 mr-1" />
            清除
          </Button>
        )}
      </div>

      {/* 高级搜索选项 */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              开始日期
            </label>
            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'yyyy-MM-dd') : "选择开始日期"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    setStartDate(date);
                    setStartDateOpen(false);
                  }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              结束日期
            </label>
            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'yyyy-MM-dd') : "选择结束日期"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => {
                    setEndDate(date);
                    setEndDateOpen(false);
                  }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* 搜索提示 */}
      {hasFilters && (
        <div className="text-sm text-muted-foreground">
          {query && (
            <span className="inline-flex items-center gap-1 mr-4">
              关键词: <span className="font-medium">{query}</span>
            </span>
          )}
          {startDate && (
            <span className="inline-flex items-center gap-1 mr-4">
              开始: <span className="font-medium">{format(startDate, 'yyyy-MM-dd')}</span>
            </span>
          )}
          {endDate && (
            <span className="inline-flex items-center gap-1">
              结束: <span className="font-medium">{format(endDate, 'yyyy-MM-dd')}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchBar;
