{
    r: flip `n`p!"SS"$\:();
    f: {sv[`]each x,'y};
    n: f[`] (key `)except`q`Q`h`j`o;
    v: key `.;
    r: r upsert (v,'`.);
    r: r upsert (n,'`root);
    r: r upsert (,/){if[((::)~first value x)&11h=type n:key x;r:(y[x] n), 'x];if[count r;r,:(,/).z.s[;y]each r[;0]];:r}[;f] each n;
    r: update t:{@[{type value x};x;-255h]} each n from r;
    r: select from r where not t in 101 -255h;
    r: update b: {string value x} each n from r where t within 100 111h;
    r: update t: {$[.Q.qt value x;98h;99h]} each n from r where t in 98 99h;
    r: update m: {@[0!meta@;x;{x}]} each n from r where t=98h;
    r: update b: {.Q.s value x} each n from r where not t within 100 111h;
    (`n xasc select from r where p=`root) uj `p`n xasc select from r where p<>`root
 }[]